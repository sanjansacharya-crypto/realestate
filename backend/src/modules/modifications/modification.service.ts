import { AssignmentStatus, BookingStatus, ModificationRequestStatus, OrganizationType, Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/db';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../common/errors/appError';

type Scope = { orgId: string; userId: string; role: Role; isSuperAdmin: boolean };
const isTerminal = (status: ModificationRequestStatus) => status === ModificationRequestStatus.REJECTED || status === ModificationRequestStatus.CANCELLED || status === ModificationRequestStatus.COMPLETED;

class ModificationService {
  private async get(id: string) {
    const item = await prisma.modificationRequest.findUnique({ where: { id }, include: { booking: true, history: { orderBy: { createdAt: 'asc' } } } });
    if (!item) throw new NotFoundError('Modification request not found.');
    return item;
  }
  private async isOwner(projectId: string, scope: Scope) {
    return scope.isSuperAdmin || !!await prisma.project.findFirst({ where: { id: projectId, organizationId: scope.orgId, isActive: true } });
  }
  private async change(id: string, from: ModificationRequestStatus, to: ModificationRequestStatus, scope: Scope, note: string | null, data: Prisma.ModificationRequestUpdateInput = {}) {
    return prisma.$transaction(async (tx) => {
      const result = await tx.modificationRequest.updateMany({ where: { id, status: from }, data: { ...data, status: to } });
      if (!result.count) throw new ConflictError('Request state changed; refresh and try again.');
      await tx.modificationRequestHistory.create({ data: { requestId: id, performedById: scope.userId, fromStatus: from, toStatus: to, note } });
      return tx.modificationRequest.findUniqueOrThrow({ where: { id }, include: { history: { orderBy: { createdAt: 'asc' } } } });
    });
  }
  async create(scope: Scope, dto: any) {
    const booking = await prisma.booking.findFirst({ where: { id: dto.bookingId, buyerId: scope.userId, ...(scope.isSuperAdmin ? {} : { organizationId: scope.orgId }), status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] } } });
    if (!booking) throw new NotFoundError('Active booking not found.');
    return prisma.$transaction(async (tx) => {
      const item = await tx.modificationRequest.create({ data: { bookingId: booking.id, projectId: booking.projectId, plotId: booking.plotId, buyerId: scope.userId, description: dto.description } });
      await tx.modificationRequestHistory.create({ data: { requestId: item.id, performedById: scope.userId, toStatus: ModificationRequestStatus.SUBMITTED, note: 'Buyer submitted modification request.' } });
      return item;
    });
  }
  async list(scope: Scope) {
    return prisma.modificationRequest.findMany({ where: scope.isSuperAdmin ? {} : { OR: [
      { buyerId: scope.userId }, { project: { organizationId: scope.orgId } },
      { contractorOrgId: scope.orgId, status: { in: [ModificationRequestStatus.ASSIGNED, ModificationRequestStatus.IN_PROGRESS] } },
    ] }, include: { history: { orderBy: { createdAt: 'asc' } } }, orderBy: { createdAt: 'desc' } });
  }
  async getById(id: string, scope: Scope) {
    const item = await this.get(id);
    if (scope.isSuperAdmin || item.buyerId === scope.userId || await this.isOwner(item.projectId, scope) || item.contractorOrgId === scope.orgId && (item.status === ModificationRequestStatus.ASSIGNED || item.status === ModificationRequestStatus.IN_PROGRESS)) return item;
    throw new NotFoundError('Modification request not found.');
  }
  async review(id: string, scope: Scope, dto: any) {
    const item = await this.get(id);
    if (!(await this.isOwner(item.projectId, scope)) || scope.role !== Role.DEVELOPER && scope.role !== Role.PLATFORM_ADMIN) throw new NotFoundError('Modification request not found.');
    if (item.buyerId === scope.userId) throw new ForbiddenError('You cannot review your own request.');
    if (item.status !== ModificationRequestStatus.SUBMITTED && item.status !== ModificationRequestStatus.UNDER_REVIEW) throw new ConflictError('Request is not awaiting review.');
    const to = dto.action === 'APPROVE' ? ModificationRequestStatus.APPROVED : ModificationRequestStatus.REJECTED;
    return this.change(id, item.status, to, scope, dto.reviewNote, { reviewNote: dto.reviewNote, reviewer: { connect: { id: scope.userId } }, reviewedAt: new Date(), ...(dto.estimatedCost !== undefined ? { estimatedCost: new Prisma.Decimal(dto.estimatedCost) } : {}), ...(dto.deadline ? { deadline: new Date(dto.deadline) } : {}) });
  }
  async assign(id: string, scope: Scope, dto: any) {
    const item = await this.get(id);
    if (!(await this.isOwner(item.projectId, scope))) throw new NotFoundError('Modification request not found.');
    if (item.status !== ModificationRequestStatus.APPROVED) throw new ConflictError('Only approved requests can be assigned.');
    const assignment = await prisma.projectOrganizationAssignment.findFirst({ where: { projectId: item.projectId, organizationId: dto.contractorOrgId, assignmentType: 'CONTRACTOR', status: AssignmentStatus.ACTIVE, organization: { type: OrganizationType.CONTRACTOR, isActive: true } } });
    if (!assignment) throw new ValidationError('Contractor must be actively assigned to this project.');
    return this.change(id, item.status, ModificationRequestStatus.ASSIGNED, scope, 'Assigned to contractor.', { contractor: { connect: { id: dto.contractorOrgId } }, assignedBy: { connect: { id: scope.userId } }, assignedAt: new Date(), ...(dto.deadline ? { deadline: new Date(dto.deadline) } : {}), ...(dto.estimatedCost !== undefined ? { estimatedCost: new Prisma.Decimal(dto.estimatedCost) } : {}) });
  }
  async start(id: string, scope: Scope) {
    const item = await this.get(id);
    if (item.contractorOrgId !== scope.orgId) throw new NotFoundError('Modification request not found.');
    if (item.status !== ModificationRequestStatus.ASSIGNED) throw new ConflictError('Only assigned requests can be started.');
    return this.change(id, item.status, ModificationRequestStatus.IN_PROGRESS, scope, 'Contractor started work.', { startedAt: new Date() });
  }
  async complete(id: string, scope: Scope, dto: any) {
    const item = await this.get(id);
    if (item.contractorOrgId !== scope.orgId) throw new NotFoundError('Modification request not found.');
    if (item.status !== ModificationRequestStatus.IN_PROGRESS) throw new ConflictError('Only in-progress requests can be completed.');
    return this.change(id, item.status, ModificationRequestStatus.COMPLETED, scope, dto.note, { completedAt: new Date(), completionEvidence: dto.evidence });
  }
  async cancel(id: string, scope: Scope, note?: string) {
    const item = await this.get(id);
    const owner = await this.isOwner(item.projectId, scope);
    if (!owner && !(item.buyerId === scope.userId)) throw new NotFoundError('Modification request not found.');
    if (isTerminal(item.status)) throw new ConflictError('Request cannot be cancelled in its current state.');
    if (!owner && item.status !== ModificationRequestStatus.SUBMITTED && item.status !== ModificationRequestStatus.UNDER_REVIEW && item.status !== ModificationRequestStatus.APPROVED) throw new ForbiddenError('Buyer cancellation is only allowed before contractor assignment.');
    return this.change(id, item.status, ModificationRequestStatus.CANCELLED, scope, note ?? null, { cancelledAt: new Date() });
  }
}
export const modificationService = new ModificationService();
