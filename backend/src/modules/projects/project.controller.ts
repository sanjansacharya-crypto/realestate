import { Request, Response, NextFunction } from 'express';
import { projectService } from './project.service';
import { projectListQuerySchema } from './project.validation';
import { ValidationError } from '../../common/errors/appError';
import { ProjectListQuery } from './project.types';

class ProjectController {
  /**
   * POST /api/v1/projects
   * Creates a new project for the authenticated user's verified organization.
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.organization!.id;
      const createdById = req.user!.id;

      const project = await projectService.create(organizationId, createdById, req.body);

      res.status(201).json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/projects
   * Lists all active projects for the authenticated user's organization.
   * Supports optional filtering by status, projectType, search text, and pagination.
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.organization!.id;

      const queryResult = projectListQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        throw new ValidationError('Invalid query parameters', queryResult.error.format());
      }

      const { projects, total, page, limit } = await projectService.list(
        organizationId,
        queryResult.data as ProjectListQuery
      );

      res.json({
        success: true,
        data: projects,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/projects/:id
   * Returns a single project by ID — only if it belongs to the user's organization.
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const organizationId = req.organization!.id;

      const project = await projectService.getById(id, organizationId);

      res.json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/projects/:id
   * Updates permitted fields on an existing project.
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const organizationId = req.organization!.id;

      const project = await projectService.update(id, organizationId, req.body);

      res.json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/projects/:id
   * Soft-archives a project (sets isActive=false, status=ARCHIVED).
   * Does NOT hard-delete — referenced data remains intact.
   */
  async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const organizationId = req.organization!.id;

      const project = await projectService.archive(id, organizationId);

      res.json({
        success: true,
        message: 'Project archived successfully.',
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
