import { Router } from 'express';
import { projectController } from './project.controller';
import { assignmentController } from './assignment.controller';
import { authenticate } from '../auth/auth.middleware';
import { requireOrganizationRole } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validateRequest';
import { createProjectSchema, updateProjectSchema } from './project.validation';
import {
  assignOrganizationSchema,
  updateOrganizationAssignmentSchema,
  assignProjectMemberSchema,
  updateProjectMemberSchema,
} from './assignment.validation';
import { plotRouter } from '../plots/plot.routes';
import { Role } from '@prisma/client';
import { projectWorkRouter } from '../work/work.routes';

export const projectRouter = Router();

// All project routes require an authenticated user with an active organization context.
// requireOrganizationRole verifies BOTH membership in the organization AND the required role.
// The organization ID is resolved from the query param, header, or the user's default membership.

/**
 * @route   POST /api/v1/projects
 * @desc    Create a new project for the authenticated user's organization
 * @access  Private — DEVELOPER or PLATFORM_ADMIN role required
 */
projectRouter.post(
  '/',
  authenticate,
  requireOrganizationRole([Role.DEVELOPER, Role.PLATFORM_ADMIN]),
  validateBody(createProjectSchema),
  projectController.create.bind(projectController)
);

/**
 * @route   GET /api/v1/projects
 * @desc    List all active projects for the authenticated organization
 * @access  Private — Any active member of the organization
 */
projectRouter.get(
  '/',
  authenticate,
  requireOrganizationRole([Role.DEVELOPER, Role.PLATFORM_ADMIN, Role.CONTRACTOR, Role.VENDOR, Role.BUYER, Role.EMPLOYEE]),
  projectController.list.bind(projectController)
);

/**
 * @route   GET /api/v1/projects/:id
 * @desc    Get a single project by ID (must belong to the authenticated organization)
 * @access  Private — Any active member of the organization
 */
projectRouter.get(
  '/:id',
  authenticate,
  requireOrganizationRole([Role.DEVELOPER, Role.PLATFORM_ADMIN, Role.CONTRACTOR, Role.VENDOR, Role.BUYER, Role.EMPLOYEE]),
  projectController.getById.bind(projectController)
);

/**
 * @route   PATCH /api/v1/projects/:id
 * @desc    Update project details
 * @access  Private — DEVELOPER or PLATFORM_ADMIN role required
 */
projectRouter.patch(
  '/:id',
  authenticate,
  requireOrganizationRole([Role.DEVELOPER, Role.PLATFORM_ADMIN]),
  validateBody(updateProjectSchema),
  projectController.update.bind(projectController)
);

/**
 * @route   DELETE /api/v1/projects/:id
 * @desc    Soft-archive a project (sets isActive=false, status=ARCHIVED)
 * @access  Private — DEVELOPER or PLATFORM_ADMIN role required
 */
projectRouter.delete(
  '/:id',
  authenticate,
  requireOrganizationRole([Role.DEVELOPER, Role.PLATFORM_ADMIN]),
  projectController.archive.bind(projectController)
);

// ---------------------------------------------------------------------------
// Phase 7: Project Organization Assignments & Memberships
// ---------------------------------------------------------------------------

/**
 * @route   POST /api/v1/projects/:id/organizations
 * @desc    Assign an external organization (Contractor/Vendor) to this project
 * @access  Private — DEVELOPER or PLATFORM_ADMIN of the owning organization
 */
projectRouter.post(
  '/:id/organizations',
  authenticate,
  requireOrganizationRole([Role.DEVELOPER, Role.PLATFORM_ADMIN]),
  validateBody(assignOrganizationSchema),
  assignmentController.assignOrganization.bind(assignmentController)
);

/**
 * @route   GET /api/v1/projects/:id/organizations
 * @desc    List organizations assigned to this project
 * @access  Private — Any active role authorized for this project
 */
projectRouter.get(
  '/:id/organizations',
  authenticate,
  requireOrganizationRole([
    Role.DEVELOPER,
    Role.PLATFORM_ADMIN,
    Role.CONTRACTOR,
    Role.VENDOR,
    Role.BUYER,
    Role.EMPLOYEE,
  ]),
  assignmentController.listProjectOrganizations.bind(assignmentController)
);

/**
 * @route   PATCH /api/v1/projects/:id/organizations/:orgId
 * @desc    Update assignment status or scope for an assigned organization
 * @access  Private — DEVELOPER or PLATFORM_ADMIN of the owning organization
 */
projectRouter.patch(
  '/:id/organizations/:orgId',
  authenticate,
  requireOrganizationRole([Role.DEVELOPER, Role.PLATFORM_ADMIN]),
  validateBody(updateOrganizationAssignmentSchema),
  assignmentController.updateOrganizationAssignment.bind(assignmentController)
);

/**
 * @route   POST /api/v1/projects/:id/members
 * @desc    Assign an individual user (employee/supervisor/PM) to this project
 * @access  Private — DEVELOPER or CONTRACTOR
 */
projectRouter.post(
  '/:id/members',
  authenticate,
  requireOrganizationRole([Role.DEVELOPER, Role.CONTRACTOR, Role.PLATFORM_ADMIN]),
  validateBody(assignProjectMemberSchema),
  assignmentController.assignMember.bind(assignmentController)
);

/**
 * @route   GET /api/v1/projects/:id/members
 * @desc    List individual members assigned to this project
 * @access  Private — Any authorized role on this project
 */
projectRouter.get(
  '/:id/members',
  authenticate,
  requireOrganizationRole([
    Role.DEVELOPER,
    Role.PLATFORM_ADMIN,
    Role.CONTRACTOR,
    Role.VENDOR,
    Role.BUYER,
    Role.EMPLOYEE,
  ]),
  assignmentController.listProjectMembers.bind(assignmentController)
);

/**
 * @route   DELETE /api/v1/projects/:id/members/:userId
 * @desc    Remove an individual user from this project
 * @access  Private — DEVELOPER or CONTRACTOR (for own employees)
 */
projectRouter.delete(
  '/:id/members/:userId',
  authenticate,
  requireOrganizationRole([Role.DEVELOPER, Role.CONTRACTOR, Role.PLATFORM_ADMIN]),
  assignmentController.removeMember.bind(assignmentController)
);

// ---------------------------------------------------------------------------
// Phase 8: Plot Inventory Routes (/api/v1/projects/:projectId/plots)
// ---------------------------------------------------------------------------
projectRouter.use('/:projectId/plots', plotRouter);
projectRouter.use('/:projectId/work-packages', projectWorkRouter);



