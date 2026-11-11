import { NextFunction, Request, Response } from 'express';
import { workService } from './work.service';
import { workListQuerySchema } from './work.validation';
import { ValidationError } from '../../common/errors/appError';

function scope(req: Request) {
  return { orgId: req.organization!.id, userId: req.user!.id, role: req.membership!.role, isSuperAdmin: req.user!.isSuperAdmin };
}

class WorkController {
  async create(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await workService.create(req.params.projectId, scope(req), req.body) }); } catch (error) { next(error); }
  }
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = workListQuerySchema.safeParse(req.query);
      if (!parsed.success) throw new ValidationError('Invalid query parameters', parsed.error.format());
      const result = await workService.list(req.params.projectId ?? parsed.data.projectId, scope(req), parsed.data);
      res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, limit: result.limit, totalPages: Math.ceil(result.total / result.limit) } });
    } catch (error) { next(error); }
  }
  async update(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await workService.update(req.params.id, scope(req), req.body) }); } catch (error) { next(error); }
  }
  async submit(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await workService.submit(req.params.id, scope(req), req.body) }); } catch (error) { next(error); }
  }
  async review(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await workService.review(req.params.updateId, scope(req), req.body) }); } catch (error) { next(error); }
  }
  async summary(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await workService.summary(req.params.projectId, scope(req)) }); } catch (error) { next(error); }
  }
}

export const workController = new WorkController();
