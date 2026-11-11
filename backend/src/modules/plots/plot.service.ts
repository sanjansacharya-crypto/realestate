import { Plot, PlotStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/db';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ValidationError,
} from '../../common/errors/appError';
import { CreatePlotDTO, UpdatePlotDTO, PlotFilterQuery } from './plot.types';

class PlotService {
  /**
   * Helper: ensure project exists and belongs to the caller's organization.
   */
  private async getOwnedProject(projectId: string, callerOrgId: string, isSuperAdmin = false) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ...(isSuperAdmin ? {} : { organizationId: callerOrgId }),
        isActive: true,
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found or not owned by your organization.');
    }
    return project;
  }

  /**
   * Create a new plot within a project.
   */
  public async createPlot(
    projectId: string,
    callerOrgId: string,
    dto: CreatePlotDTO,
    isSuperAdmin = false
  ): Promise<Plot> {
    await this.getOwnedProject(projectId, callerOrgId, isSuperAdmin);

    // Guard against duplicate plot number within project
    const existing = await prisma.plot.findUnique({
      where: {
        projectId_plotNumber: {
          projectId,
          plotNumber: dto.plotNumber.toUpperCase(),
        },
      },
    });

    if (existing) {
      throw new ConflictError(
        `Plot '${dto.plotNumber.toUpperCase()}' already exists in this project.`
      );
    }

    return prisma.plot.create({
      data: {
        projectId,
        plotNumber: dto.plotNumber.toUpperCase(),
        plotType: dto.plotType ?? 'RESIDENTIAL',
        status: dto.status ?? PlotStatus.AVAILABLE,
        area: new Prisma.Decimal(dto.area),
        areaUnit: dto.areaUnit ?? 'SQ_FT',
        length: dto.length != null ? new Prisma.Decimal(dto.length) : null,
        width: dto.width != null ? new Prisma.Decimal(dto.width) : null,
        facing: dto.facing ?? null,
        block: dto.block ?? null,
        sector: dto.sector ?? null,
        layoutReference: dto.layoutReference ?? null,
        basePricePerUnit:
          dto.basePricePerUnit != null ? new Prisma.Decimal(dto.basePricePerUnit) : null,
        totalPrice: new Prisma.Decimal(dto.totalPrice),
        currency: dto.currency ?? 'INR',
        isCornerPlot: dto.isCornerPlot ?? false,
        isParkFacing: dto.isParkFacing ?? false,
        premiumCharges:
          dto.premiumCharges != null ? new Prisma.Decimal(dto.premiumCharges) : new Prisma.Decimal(0),
        description: dto.description ?? null,
      },
    });
  }

  /**
   * Bulk creation of plots (useful for initializing plotted subdivisions).
   */
  public async createPlotsBulk(
    projectId: string,
    callerOrgId: string,
    plots: CreatePlotDTO[],
    isSuperAdmin = false
  ): Promise<{ createdCount: number }> {
    await this.getOwnedProject(projectId, callerOrgId, isSuperAdmin);

    if (!Array.isArray(plots) || plots.length === 0) {
      throw new ValidationError('A non-empty array of plots must be provided.');
    }

    // Check for internal duplicates in the batch
    const batchNumbers = plots.map((p) => p.plotNumber.toUpperCase());
    const uniqueNumbers = new Set(batchNumbers);
    if (uniqueNumbers.size !== batchNumbers.length) {
      throw new ConflictError('Batch contains duplicate plot numbers.');
    }

    // Check against existing database plots
    const existing = await prisma.plot.findMany({
      where: {
        projectId,
        plotNumber: { in: Array.from(uniqueNumbers) },
      },
      select: { plotNumber: true },
    });

    if (existing.length > 0) {
      const conflicts = existing.map((p) => p.plotNumber).join(', ');
      throw new ConflictError(
        `The following plot numbers already exist in this project: ${conflicts}`
      );
    }

    const created = await prisma.$transaction(
      plots.map((dto) =>
        prisma.plot.create({
          data: {
            projectId,
            plotNumber: dto.plotNumber.toUpperCase(),
            plotType: dto.plotType ?? 'RESIDENTIAL',
            status: dto.status ?? PlotStatus.AVAILABLE,
            area: new Prisma.Decimal(dto.area),
            areaUnit: dto.areaUnit ?? 'SQ_FT',
            length: dto.length != null ? new Prisma.Decimal(dto.length) : null,
            width: dto.width != null ? new Prisma.Decimal(dto.width) : null,
            facing: dto.facing ?? null,
            block: dto.block ?? null,
            sector: dto.sector ?? null,
            layoutReference: dto.layoutReference ?? null,
            basePricePerUnit:
              dto.basePricePerUnit != null ? new Prisma.Decimal(dto.basePricePerUnit) : null,
            totalPrice: new Prisma.Decimal(dto.totalPrice),
            currency: dto.currency ?? 'INR',
            isCornerPlot: dto.isCornerPlot ?? false,
            isParkFacing: dto.isParkFacing ?? false,
            premiumCharges:
              dto.premiumCharges != null
                ? new Prisma.Decimal(dto.premiumCharges)
                : new Prisma.Decimal(0),
            description: dto.description ?? null,
          },
        })
      )
    );

    return { createdCount: created.length };
  }

  /**
   * List plots for a project with filters and pagination.
   * Enforces role visibility: Buyers only see AVAILABLE plots unless specified.
   */
  public async listPlots(
    projectId: string,
    callerOrgId: string,
    callerRole: Role,
    query: PlotFilterQuery,
    isSuperAdmin = false
  ): Promise<{ plots: Plot[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Build query filters
    const where: Prisma.PlotWhereInput = {
      projectId,
      isActive: true,
      ...(query.status ? { status: query.status } : {}),
      ...(query.plotType ? { plotType: query.plotType } : {}),
      ...(query.facing ? { facing: query.facing } : {}),
      ...(query.block ? { block: query.block } : {}),
      ...(query.sector ? { sector: query.sector } : {}),
      ...(query.isCornerPlot !== undefined ? { isCornerPlot: query.isCornerPlot } : {}),
      ...(query.isParkFacing !== undefined ? { isParkFacing: query.isParkFacing } : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? {
            totalPrice: {
              ...(query.minPrice !== undefined ? { gte: new Prisma.Decimal(query.minPrice) } : {}),
              ...(query.maxPrice !== undefined ? { lte: new Prisma.Decimal(query.maxPrice) } : {}),
            },
          }
        : {}),
      ...(query.minArea !== undefined || query.maxArea !== undefined
        ? {
            area: {
              ...(query.minArea !== undefined ? { gte: new Prisma.Decimal(query.minArea) } : {}),
              ...(query.maxArea !== undefined ? { lte: new Prisma.Decimal(query.maxArea) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { plotNumber: { contains: query.search, mode: 'insensitive' } },
              { block: { contains: query.search, mode: 'insensitive' } },
              { sector: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Buyer scoping: Buyers should only see AVAILABLE plots
    if (callerRole === Role.BUYER && !isSuperAdmin) {
      where.status = PlotStatus.AVAILABLE;
    }

    const [plots, total] = await prisma.$transaction([
      prisma.plot.findMany({
        where,
        orderBy: [{ block: 'asc' }, { plotNumber: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.plot.count({ where }),
    ]);

    return { plots, total, page, limit };
  }

  /**
   * Get single plot by ID.
   */
  public async getPlotById(
    projectId: string,
    plotId: string,
    callerRole: Role,
    isSuperAdmin = false
  ): Promise<Plot> {
    const plot = await prisma.plot.findFirst({
      where: { id: plotId, projectId, isActive: true },
    });

    if (!plot) {
      throw new NotFoundError('Plot not found.');
    }

    // If buyer, block access to BLOCKED plots
    if (callerRole === Role.BUYER && !isSuperAdmin && plot.status === PlotStatus.BLOCKED) {
      throw new NotFoundError('Plot not found.');
    }

    return plot;
  }

  /**
   * Update plot details (Developer only).
   */
  public async updatePlot(
    projectId: string,
    plotId: string,
    callerOrgId: string,
    dto: UpdatePlotDTO,
    isSuperAdmin = false
  ): Promise<Plot> {
    await this.getOwnedProject(projectId, callerOrgId, isSuperAdmin);

    const plot = await prisma.plot.findFirst({
      where: { id: plotId, projectId, isActive: true },
    });

    if (!plot) {
      throw new NotFoundError('Plot not found.');
    }

    // Check plot number uniqueness if being modified
    if (dto.plotNumber && dto.plotNumber.toUpperCase() !== plot.plotNumber) {
      const conflict = await prisma.plot.findUnique({
        where: {
          projectId_plotNumber: {
            projectId,
            plotNumber: dto.plotNumber.toUpperCase(),
          },
        },
      });
      if (conflict) {
        throw new ConflictError(
          `Plot '${dto.plotNumber.toUpperCase()}' already exists in this project.`
        );
      }
    }

    return prisma.plot.update({
      where: { id: plotId },
      data: {
        ...(dto.plotNumber !== undefined ? { plotNumber: dto.plotNumber.toUpperCase() } : {}),
        ...(dto.plotType !== undefined ? { plotType: dto.plotType } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.area !== undefined ? { area: new Prisma.Decimal(dto.area) } : {}),
        ...(dto.areaUnit !== undefined ? { areaUnit: dto.areaUnit } : {}),
        ...(dto.length !== undefined
          ? { length: dto.length != null ? new Prisma.Decimal(dto.length) : null }
          : {}),
        ...(dto.width !== undefined
          ? { width: dto.width != null ? new Prisma.Decimal(dto.width) : null }
          : {}),
        ...(dto.facing !== undefined ? { facing: dto.facing } : {}),
        ...(dto.block !== undefined ? { block: dto.block } : {}),
        ...(dto.sector !== undefined ? { sector: dto.sector } : {}),
        ...(dto.layoutReference !== undefined ? { layoutReference: dto.layoutReference } : {}),
        ...(dto.basePricePerUnit !== undefined
          ? {
              basePricePerUnit:
                dto.basePricePerUnit != null ? new Prisma.Decimal(dto.basePricePerUnit) : null,
            }
          : {}),
        ...(dto.totalPrice !== undefined ? { totalPrice: new Prisma.Decimal(dto.totalPrice) } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.isCornerPlot !== undefined ? { isCornerPlot: dto.isCornerPlot } : {}),
        ...(dto.isParkFacing !== undefined ? { isParkFacing: dto.isParkFacing } : {}),
        ...(dto.premiumCharges !== undefined
          ? { premiumCharges: new Prisma.Decimal(dto.premiumCharges) }
          : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    });
  }

  /**
   * Soft-delete a plot.
   * Crucial business rule: Plots that have been BOOKED or SOLD cannot be deleted!
   */
  public async deletePlot(
    projectId: string,
    plotId: string,
    callerOrgId: string,
    isSuperAdmin = false
  ): Promise<{ success: boolean; message: string }> {
    await this.getOwnedProject(projectId, callerOrgId, isSuperAdmin);

    const plot = await prisma.plot.findFirst({
      where: { id: plotId, projectId, isActive: true },
    });

    if (!plot) {
      throw new NotFoundError('Plot not found.');
    }

    if (plot.status === PlotStatus.BOOKED || plot.status === PlotStatus.SOLD) {
      throw new ForbiddenError(
        `Cannot delete plot '${plot.plotNumber}' because its status is ${plot.status}. Booked or sold plots must be preserved for audit and accounting integrity.`
      );
    }

    await prisma.plot.update({
      where: { id: plotId },
      data: { isActive: false },
    });

    return { success: true, message: `Plot '${plot.plotNumber}' archived successfully.` };
  }
}

export const plotService = new PlotService();

