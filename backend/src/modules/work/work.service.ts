import { AssignmentStatus, ProgressUpdateStatus, Prisma, Role, WorkPackageStatus } from '@prisma/client';
import { prisma } from '../../config/db';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../common/errors/appError';

type Scope = { orgId: string; userId: string; role: Role; isSuperAdmin: boolean };

class WorkService {
  private async getPackage(id: string) {
    const item = await prisma.workPackage.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Work package not found.');
    return item;
  }

  private async assertProjectAccess(projectId: string, scope: Scope, write = false) {
    const project = await prisma.project.findFirst({ where: { id: projectId, isActive: true, ...(scope.isSuperAdmin ? {} : { OR: [
      { organizationId: scope.orgId },
      { organizationAssignments: { some: { organizationId: scope.orgId, status: AssignmentStatus.ACTIVE } } },
      { members: { some: { userId: scope.userId, status: AssignmentStatus.ACTIVE } } },
    ] }) } });
    if (!project) throw new NotFoundError('Project not found or access denied.');
    const owner = scope.isSuperAdmin || project.organizationId === scope.orgId;
    if (write && !owner) throw new ForbiddenError('Only the project owner can manage work packages.');
    return { project, owner };
  }

  private async assertPackageAccess(item: { projectId: string; contractorOrgId: string }, scope: Scope) {
    const { owner } = await this.assertProjectAccess(item.projectId, scope);
    if (!owner && item.contractorOrgId !== scope.orgId) throw new NotFoundError('Work package not found.');
    return owner;
  }

  private async approvedTotal(workPackageId: string, tx: Prisma.TransactionClient | typeof prisma = prisma) {
    const result = await tx.progressUpdate.aggregate({ where: { workPackageId, status: ProgressUpdateStatus.APPROVED }, _sum: { progressDelta: true } });
    return Number(result._sum.progressDelta ?? 0);
  }

  async create(projectId: string, scope: Scope, dto: any) {
    await this.assertProjectAccess(projectId, scope, true);
    const assignment = await prisma.projectOrganizationAssignment.findFirst({ where: { projectId, organizationId: dto.contractorOrgId, assignmentType: 'CONTRACTOR', status: AssignmentStatus.ACTIVE } });
    if (!assignment) throw new ValidationError('Contractor must have an active contractor assignment to this project.');
    return prisma.workPackage.create({ data: { projectId, contractorOrgId: dto.contractorOrgId, assignedById: scope.userId, category: dto.category, title: dto.title, description: dto.description ?? null, plannedWeight: new Prisma.Decimal(dto.plannedWeight), deadline: dto.deadline ? new Date(dto.deadline) : null } });
  }

  async list(projectId: string | undefined, scope: Scope, query: { status?: WorkPackageStatus; page: number; limit: number }) {
    const where: Prisma.WorkPackageWhereInput = { ...(query.status ? { status: query.status } : {}), ...(projectId ? { projectId } : {}), ...(scope.isSuperAdmin ? {} : { OR: [
      { project: { organizationId: scope.orgId } },
      { contractorOrgId: scope.orgId, project: { organizationAssignments: { some: { organizationId: scope.orgId, status: AssignmentStatus.ACTIVE } } } },
      { project: { members: { some: { userId: scope.userId, status: AssignmentStatus.ACTIVE } } } },
    ] }) };
    const [items, total] = await prisma.$transaction([prisma.workPackage.findMany({ where, include: { progressUpdates: { orderBy: { workDate: 'desc' } } }, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }), prisma.workPackage.count({ where })]);
    return { items: await Promise.all(items.map(async (item) => ({ ...item, progress: await this.approvedTotal(item.id) }))), total, page: query.page, limit: query.limit };
  }

  async update(id: string, scope: Scope, dto: any) {
    const item = await this.getPackage(id);
    if (!(await this.assertPackageAccess(item, scope))) throw new ForbiddenError('Only the project owner can manage work packages.');
    if (dto.status === WorkPackageStatus.COMPLETED && await this.approvedTotal(id) < 100) throw new ValidationError('A work package can only be completed when approved progress reaches 100%.');
    return prisma.workPackage.update({ where: { id }, data: { ...(dto.category !== undefined ? { category: dto.category } : {}), ...(dto.title !== undefined ? { title: dto.title } : {}), ...(dto.description !== undefined ? { description: dto.description } : {}), ...(dto.plannedWeight !== undefined ? { plannedWeight: new Prisma.Decimal(dto.plannedWeight) } : {}), ...(dto.status !== undefined ? { status: dto.status } : {}), ...(dto.deadline !== undefined ? { deadline: dto.deadline ? new Date(dto.deadline) : null } : {}) } });
  }

  async submit(id: string, scope: Scope, dto: any) {
    const item = await this.getPackage(id);
    await this.assertPackageAccess(item, scope);
    if (scope.orgId !== item.contractorOrgId || (scope.role !== Role.CONTRACTOR && scope.role !== Role.EMPLOYEE)) throw new ForbiddenError('Only assigned contractor organization users can submit progress.');
    if (item.status === WorkPackageStatus.COMPLETED || item.status === WorkPackageStatus.ON_HOLD) throw new ConflictError('Progress cannot be submitted for a completed or on-hold package.');
    if (await this.approvedTotal(id) + dto.progressDelta > 100) throw new ValidationError('Approved progress plus this update cannot exceed 100%.');
    try {
      return await prisma.progressUpdate.create({ data: { workPackageId: id, submittedById: scope.userId, workDate: new Date(`${dto.workDate}T00:00:00.000Z`), progressDelta: new Prisma.Decimal(dto.progressDelta), description: dto.description, photoMetadata: dto.photoMetadata ?? Prisma.JsonNull } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictError('This user already submitted progress for this package and date.');
      throw error;
    }
  }

  async review(updateId: string, scope: Scope, dto: any) {
    const update = await prisma.progressUpdate.findUnique({ where: { id: updateId }, include: { workPackage: true } });
    if (!update) throw new NotFoundError('Progress update not found.');
    if (!(await this.assertPackageAccess(update.workPackage, scope)) || (scope.role !== Role.DEVELOPER && scope.role !== Role.PLATFORM_ADMIN)) throw new ForbiddenError('Only the project owner can review progress.');
    if (update.submittedById === scope.userId) throw new ForbiddenError('You cannot review your own progress submission.');
    if (update.status !== ProgressUpdateStatus.SUBMITTED) throw new ConflictError('Progress update has already been reviewed.');
    return prisma.$transaction(async (tx) => {
      const locked = await tx.progressUpdate.findUnique({ where: { id: updateId } });
      if (!locked || locked.status !== ProgressUpdateStatus.SUBMITTED) throw new ConflictError('Progress update has already been reviewed.');
      if (dto.action === 'APPROVE') {
        await tx.$queryRaw`SELECT "id" FROM "work_packages" WHERE "id" = ${update.workPackageId}::uuid FOR UPDATE`;
        if (await this.approvedTotal(update.workPackageId, tx) + Number(update.progressDelta) > 100) throw new ConflictError('Approving this update would exceed 100% package progress.');
      }
      const reviewed = await tx.progressUpdate.update({ where: { id: updateId }, data: { status: dto.action === 'APPROVE' ? ProgressUpdateStatus.APPROVED : ProgressUpdateStatus.REJECTED, reviewedById: scope.userId, reviewedAt: new Date(), reviewNote: dto.reviewNote } });
      if (dto.action === 'APPROVE') {
        const total = await this.approvedTotal(update.workPackageId, tx);
        await tx.workPackage.update({ where: { id: update.workPackageId }, data: { status: total >= 100 ? WorkPackageStatus.COMPLETED : WorkPackageStatus.IN_PROGRESS } });
      }
      return reviewed;
    });
  }

  async summary(projectId: string, scope: Scope) {
    await this.assertProjectAccess(projectId, scope);
    const packages = await prisma.workPackage.findMany({ where: { projectId }, include: { progressUpdates: { where: { status: ProgressUpdateStatus.APPROVED } } } });
    const totalWeight = packages.reduce((sum, item) => sum + Number(item.plannedWeight), 0);
    const weightedProgress = packages.reduce((sum, item) => sum + Number(item.plannedWeight) * Math.min(100, item.progressUpdates.reduce((p, update) => p + Number(update.progressDelta), 0)), 0);
    return { projectId, packageCount: packages.length, totalPlannedWeight: totalWeight, progress: totalWeight ? Math.round(weightedProgress / totalWeight * 100) / 100 : 0, packages: packages.map(({ progressUpdates, ...item }) => ({ ...item, progress: Math.min(100, Math.round(progressUpdates.reduce((sum, update) => sum + Number(update.progressDelta), 0) * 100) / 100) })) };
  }
}

export const workService = new WorkService();
