import { Project, ProjectStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { NotFoundError, ConflictError, ForbiddenError } from '../../common/errors/appError';
import { CreateProjectDTO, UpdateProjectDTO, ProjectListQuery } from './project.types';

class ProjectService {
  /**
   * Creates a new project for the given organization.
   * The organizationId and createdById come from verified server-side session data —
   * never from the client request body.
   */
  public async create(
    organizationId: string,
    createdById: string,
    dto: CreateProjectDTO
  ): Promise<Project> {
    // Guard against duplicate project code within the same organization
    const existing = await prisma.project.findUnique({
      where: { organizationId_code: { organizationId, code: dto.code.toUpperCase() } },
    });
    if (existing) {
      throw new ConflictError(
        `A project with code '${dto.code.toUpperCase()}' already exists in this organization.`
      );
    }

    return prisma.project.create({
      data: {
        organizationId,
        createdById,
        name: dto.name,
        code: dto.code.toUpperCase(),
        description: dto.description ?? null,
        projectType: dto.projectType ?? 'PLOTTED_DEVELOPMENT',
        status: dto.status ?? 'PLANNING',
        reraNumber: dto.reraNumber ?? null,
        address: dto.address ?? null,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode ?? null,
        country: dto.country ?? 'India',
        latitude: dto.latitude != null ? new Prisma.Decimal(dto.latitude) : null,
        longitude: dto.longitude != null ? new Prisma.Decimal(dto.longitude) : null,
        totalArea: dto.totalArea != null ? new Prisma.Decimal(dto.totalArea) : null,
        areaUnit: dto.areaUnit ?? 'ACRES',
        expectedStartDate: dto.expectedStartDate ? new Date(dto.expectedStartDate) : null,
        expectedCompletionDate: dto.expectedCompletionDate
          ? new Date(dto.expectedCompletionDate)
          : null,
      },
    });
  }

  /**
   * Lists projects belonging to the organization.
   * Automatically scoped to organizationId — users can only see their own org's projects.
   */
  public async list(
    organizationId: string,
    query: ProjectListQuery
  ): Promise<{ projects: Project[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {
      organizationId,
      isActive: true,
      ...(query.status ? { status: query.status } : {}),
      ...(query.projectType ? { projectType: query.projectType } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
              { city: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [projects, total] = await prisma.$transaction([
      prisma.project.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    return { projects, total, page, limit };
  }

  /**
   * Returns a single project — only if it belongs to the requesting organization.
   * Returns 404 (not 403) on mismatch to prevent cross-tenant ID enumeration.
   */
  public async getById(projectId: string, organizationId: string): Promise<Project> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId, isActive: true },
    });

    if (!project) {
      throw new NotFoundError('Project not found.');
    }

    return project;
  }

  /**
   * Updates a project. Ownership and organization membership are verified before this call
   * via middleware. Protected fields (id, organizationId, createdById, createdAt) are never touched.
   */
  public async update(
    projectId: string,
    organizationId: string,
    dto: UpdateProjectDTO
  ): Promise<Project> {
    // Confirm the project exists and belongs to this organization
    const project = await this.getById(projectId, organizationId);

    // Guard: If the code is being changed, check uniqueness within org
    if (dto.code && dto.code.toUpperCase() !== project.code) {
      const conflict = await prisma.project.findUnique({
        where: {
          organizationId_code: {
            organizationId,
            code: dto.code.toUpperCase(),
          },
        },
      });
      if (conflict) {
        throw new ConflictError(
          `A project with code '${dto.code.toUpperCase()}' already exists in this organization.`
        );
      }
    }

    // Guard: Cannot un-archive a project that was hard-archived
    if (project.status === ProjectStatus.ARCHIVED && dto.status && dto.status !== ProjectStatus.ARCHIVED) {
      throw new ForbiddenError(
        'An archived project cannot be reactivated. Please contact your administrator.'
      );
    }

    return prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.code !== undefined ? { code: dto.code.toUpperCase() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.projectType !== undefined ? { projectType: dto.projectType } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.reraNumber !== undefined ? { reraNumber: dto.reraNumber } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.state !== undefined ? { state: dto.state } : {}),
        ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode } : {}),
        ...(dto.country !== undefined ? { country: dto.country } : {}),
        ...(dto.latitude !== undefined
          ? { latitude: dto.latitude != null ? new Prisma.Decimal(dto.latitude) : null }
          : {}),
        ...(dto.longitude !== undefined
          ? { longitude: dto.longitude != null ? new Prisma.Decimal(dto.longitude) : null }
          : {}),
        ...(dto.totalArea !== undefined
          ? { totalArea: dto.totalArea != null ? new Prisma.Decimal(dto.totalArea) : null }
          : {}),
        ...(dto.areaUnit !== undefined ? { areaUnit: dto.areaUnit } : {}),
        ...(dto.expectedStartDate !== undefined
          ? {
              expectedStartDate: dto.expectedStartDate
                ? new Date(dto.expectedStartDate)
                : null,
            }
          : {}),
        ...(dto.expectedCompletionDate !== undefined
          ? {
              expectedCompletionDate: dto.expectedCompletionDate
                ? new Date(dto.expectedCompletionDate)
                : null,
            }
          : {}),
        ...(dto.actualCompletionDate !== undefined
          ? {
              actualCompletionDate: dto.actualCompletionDate
                ? new Date(dto.actualCompletionDate)
                : null,
            }
          : {}),
      },
    });
  }

  /**
   * Soft-archives a project: marks isActive=false and status=ARCHIVED.
   * Hard deletion is NOT performed — referenced plots, bookings and history remain intact.
   */
  public async archive(projectId: string, organizationId: string): Promise<Project> {
    // Confirm existence and ownership
    await this.getById(projectId, organizationId);

    return prisma.project.update({
      where: { id: projectId },
      data: { isActive: false, status: ProjectStatus.ARCHIVED },
    });
  }
}

export const projectService = new ProjectService();
