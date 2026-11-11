import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../auth/auth.middleware';
import { requireOrganizationRole } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validateRequest';
import { workController } from './work.controller';
import { createWorkPackageSchema, reviewProgressSchema, submitProgressSchema, updateWorkPackageSchema } from './work.validation';

export const workRouter = Router();
export const projectWorkRouter = Router({ mergeParams: true });

const readRoles = [Role.DEVELOPER, Role.PLATFORM_ADMIN, Role.CONTRACTOR, Role.EMPLOYEE] as Role[];
const sellerRoles = [Role.DEVELOPER, Role.PLATFORM_ADMIN] as Role[];
const contractorRoles = [Role.CONTRACTOR, Role.EMPLOYEE] as Role[];

projectWorkRouter.post('/', authenticate, requireOrganizationRole(sellerRoles), validateBody(createWorkPackageSchema), workController.create.bind(workController));
projectWorkRouter.get('/', authenticate, requireOrganizationRole(readRoles), workController.list.bind(workController));
projectWorkRouter.get('/summary', authenticate, requireOrganizationRole(readRoles), workController.summary.bind(workController));

workRouter.get('/', authenticate, requireOrganizationRole(readRoles), workController.list.bind(workController));
workRouter.patch('/:id', authenticate, requireOrganizationRole(sellerRoles), validateBody(updateWorkPackageSchema), workController.update.bind(workController));
workRouter.post('/:id/progress', authenticate, requireOrganizationRole(contractorRoles), validateBody(submitProgressSchema), workController.submit.bind(workController));
workRouter.patch('/:id/progress/:updateId/review', authenticate, requireOrganizationRole(sellerRoles), validateBody(reviewProgressSchema), workController.review.bind(workController));
