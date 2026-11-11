import { Request, Response, NextFunction } from 'express';
import { assignmentService } from './assignment.service';

class AssignmentController {
  /**
   * POST /api/v1/projects/:id/organizations
   * Assign an external organization (Contractor/Vendor) to this project.
   */
  async assignOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.id;
      const callerOrgId = req.organization!.id;
      const callerUserId = req.user!.id;
      const isSuperAdmin = req.user!.isSuperAdmin;

      const assignment = await assignmentService.assignOrganization(
        projectId,
        callerOrgId,
        callerUserId,
        req.body,
        isSuperAdmin
      );

      res.status(201).json({ success: true, data: assignment });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/projects/:id/organizations
   * List organizations assigned to this project.
   */
  async listProjectOrganizations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.id;
      const callerOrgId = req.organization!.id;
      const callerUserId = req.user!.id;
      const isSuperAdmin = req.user!.isSuperAdmin;

      const assignments = await assignmentService.listProjectOrganizations(
        projectId,
        callerOrgId,
        callerUserId,
        isSuperAdmin
      );

      res.json({ success: true, data: assignments });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/projects/:id/organizations/:orgId
   * Update status/details of an assigned organization.
   */
  async updateOrganizationAssignment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id: projectId, orgId: targetOrgId } = req.params;
      const callerOrgId = req.organization!.id;
      const isSuperAdmin = req.user!.isSuperAdmin;

      const updated = await assignmentService.updateOrganizationAssignment(
        projectId,
        targetOrgId,
        callerOrgId,
        req.body,
        isSuperAdmin
      );

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/projects/:id/members
   * Assign an individual user (employee/supervisor/PM) to this project.
   */
  async assignMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.id;
      const callerOrgId = req.organization!.id;
      const callerUserId = req.user!.id;
      const callerRole = req.membership!.role;
      const isSuperAdmin = req.user!.isSuperAdmin;

      const member = await assignmentService.assignMember(
        projectId,
        callerOrgId,
        callerUserId,
        callerRole,
        req.body,
        isSuperAdmin
      );

      res.status(201).json({ success: true, data: member });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/projects/:id/members
   * List members assigned to this project.
   */
  async listProjectMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.id;
      const callerOrgId = req.organization!.id;
      const callerUserId = req.user!.id;
      const isSuperAdmin = req.user!.isSuperAdmin;

      const members = await assignmentService.listProjectMembers(
        projectId,
        callerOrgId,
        callerUserId,
        isSuperAdmin
      );

      res.json({ success: true, data: members });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/projects/:id/members/:userId
   * Remove a member from this project.
   */
  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: projectId, userId: targetUserId } = req.params;
      const callerOrgId = req.organization!.id;
      const callerRole = req.membership!.role;
      const isSuperAdmin = req.user!.isSuperAdmin;

      const result = await assignmentService.removeMember(
        projectId,
        targetUserId,
        callerOrgId,
        callerRole,
        isSuperAdmin
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const assignmentController = new AssignmentController();
