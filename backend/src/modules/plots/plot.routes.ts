import { Router } from 'express';
import { plotController } from './plot.controller';
import { authenticate } from '../auth/auth.middleware';
import { requireOrganizationRole } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validateRequest';
import { createPlotSchema, updatePlotSchema } from './plot.validation';
import { Role } from '@prisma/client';
import { z } from 'zod';

export const plotRouter = Router({ mergeParams: true });

const bulkPlotSchema = z.object({
  plots: z.array(createPlotSchema).min(1, 'At least one plot must be provided'),
});

/**
 * @route   POST /api/v1/projects/:projectId/plots
 * @desc    Create a new plot in the project
 * @access  Private — DEVELOPER or PLATFORM_ADMIN
 */
plotRouter.post(
  '/',
  authenticate,
  requireOrganizationRole([Role.DEVELOPER, Role.PLATFORM_ADMIN]),
  validateBody(createPlotSchema),
  plotController.create.bind(plotController)
);

/**
 * @route   POST /api/v1/projects/:projectId/plots/bulk
 * @desc    Bulk create multiple plots in the project
 * @access  Private — DEVELOPER or PLATFORM_ADMIN
 */
plotRouter.post(
  '/bulk',
  authenticate,
  requireOrganizationRole([Role.DEVELOPER, Role.PLATFORM_ADMIN]),
  validateBody(bulkPlotSchema),
  plotController.createBulk.bind(plotController)
);

/**
 * @route   GET /api/v1/projects/:projectId/plots
 * @desc    List all plots for this project (Buyers only see AVAILABLE plots)
 * @access  Private — Any authenticated role on the project
 */
plotRouter.get(
  '/',
  authenticate,
  requireOrganizationRole([
    Role.DEVELOPER,
    Role.PLATFORM_ADMIN,
    Role.CONTRACTOR,
    Role.VENDOR,
    Role.BUYER,
    Role.EMPLOYEE,
  ]),
  plotController.list.bind(plotController)
);

/**
 * @route   GET /api/v1/projects/:projectId/plots/:id
 * @desc    Get detailed plot information
 * @access  Private — Any authenticated role
 */
plotRouter.get(
  '/:id',
  authenticate,
  requireOrganizationRole([
    Role.DEVELOPER,
    Role.PLATFORM_ADMIN,
    Role.CONTRACTOR,
    Role.VENDOR,
    Role.BUYER,
    Role.EMPLOYEE,
  ]),
  plotController.getById.bind(plotController)
);

/**
 * @route   PATCH /api/v1/projects/:projectId/plots/:id
 * @desc    Update plot details and pricing (Buyers cannot call this)
 * @access  Private — DEVELOPER or PLATFORM_ADMIN
 */
plotRouter.patch(
  '/:id',
  authenticate,
  requireOrganizationRole([Role.DEVELOPER, Role.PLATFORM_ADMIN]),
  validateBody(updatePlotSchema),
  plotController.update.bind(plotController)
);

/**
 * @route   DELETE /api/v1/projects/:projectId/plots/:id
 * @desc    Soft-archive a plot (Prevented if status is BOOKED or SOLD)
 * @access  Private — DEVELOPER or PLATFORM_ADMIN
 */
plotRouter.delete(
  '/:id',
  authenticate,
  requireOrganizationRole([Role.DEVELOPER, Role.PLATFORM_ADMIN]),
  plotController.delete.bind(plotController)
);

