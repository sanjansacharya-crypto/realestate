import { NextFunction, Request, Response } from 'express';
import { modificationService } from './modification.service';
const scope = (r: Request) => ({ orgId: r.organization!.id, userId: r.user!.id, role: r.membership!.role, isSuperAdmin: r.user!.isSuperAdmin });
class ModificationController {
  async create(r: Request, s: Response, n: NextFunction) { try { s.status(201).json({ success: true, data: await modificationService.create(scope(r), r.body) }); } catch (e) { n(e); } }
  async list(r: Request, s: Response, n: NextFunction) { try { s.json({ success: true, data: await modificationService.list(scope(r)) }); } catch (e) { n(e); } }
  async get(r: Request, s: Response, n: NextFunction) { try { s.json({ success: true, data: await modificationService.getById(r.params.id, scope(r)) }); } catch (e) { n(e); } }
  async review(r: Request, s: Response, n: NextFunction) { try { s.json({ success: true, data: await modificationService.review(r.params.id, scope(r), r.body) }); } catch (e) { n(e); } }
  async assign(r: Request, s: Response, n: NextFunction) { try { s.json({ success: true, data: await modificationService.assign(r.params.id, scope(r), r.body) }); } catch (e) { n(e); } }
  async start(r: Request, s: Response, n: NextFunction) { try { s.json({ success: true, data: await modificationService.start(r.params.id, scope(r)) }); } catch (e) { n(e); } }
  async complete(r: Request, s: Response, n: NextFunction) { try { s.json({ success: true, data: await modificationService.complete(r.params.id, scope(r), r.body) }); } catch (e) { n(e); } }
  async cancel(r: Request, s: Response, n: NextFunction) { try { s.json({ success: true, data: await modificationService.cancel(r.params.id, scope(r), r.body.note) }); } catch (e) { n(e); } }
}
export const modificationController = new ModificationController();
