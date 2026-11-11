import { Request, Response, NextFunction } from 'express';
import { plotService } from './plot.service';
import { plotFilterQuerySchema } from './plot.validation';
import { ValidationError } from '../../common/errors/appError';

class PlotController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      const callerOrgId = req.organization!.id;
      const isSuperAdmin = req.user!.isSuperAdmin;

      const plot = await plotService.createPlot(projectId, callerOrgId, req.body, isSuperAdmin);
      res.status(201).json({ success: true, data: plot });
    } catch (error) {
      next(error);
    }
  }

  async createBulk(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      const callerOrgId = req.organization!.id;
      const isSuperAdmin = req.user!.isSuperAdmin;

      const result = await plotService.createPlotsBulk(
        projectId,
        callerOrgId,
        req.body.plots,
        isSuperAdmin
      );
      res.status(201).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      const callerOrgId = req.organization!.id;
      const callerRole = req.membership!.role;
      const isSuperAdmin = req.user!.isSuperAdmin;

      const queryResult = plotFilterQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        throw new ValidationError('Invalid query parameters', queryResult.error.format());
      }

      const { plots, total, page, limit } = await plotService.listPlots(
        projectId,
        callerOrgId,
        callerRole,
        queryResult.data,
        isSuperAdmin
      );

      res.json({
        success: true,
        data: plots,
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

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId, id } = req.params;
      const callerRole = req.membership!.role;
      const isSuperAdmin = req.user!.isSuperAdmin;

      const plot = await plotService.getPlotById(projectId, id, callerRole, isSuperAdmin);
      res.json({ success: true, data: plot });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId, id } = req.params;
      const callerOrgId = req.organization!.id;
      const isSuperAdmin = req.user!.isSuperAdmin;

      const updated = await plotService.updatePlot(
        projectId,
        id,
        callerOrgId,
        req.body,
        isSuperAdmin
      );
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId, id } = req.params;
      const callerOrgId = req.organization!.id;
      const isSuperAdmin = req.user!.isSuperAdmin;

      const result = await plotService.deletePlot(projectId, id, callerOrgId, isSuperAdmin);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const plotController = new PlotController();

