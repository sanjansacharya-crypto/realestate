import {
  ProjectOrganizationAssignment,
  ProjectMember,
  AssignmentStatus,
  ProjectMemberRole,
  Role,
} from '@prisma/client';
import { prisma } from '../../config/db';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ValidationError,
} from '../../common/errors/appError';
import {
  AssignOrganizationDTO,
  UpdateOrganizationAssignmentDTO,
  AssignProjectMemberDTO,
  UpdateProjectMemberDTO,
} from './assignment.types';

class AssignmentService {
  /**
   * Helper: verify that the caller's organization owns the project.
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
   * Helper: verify that the caller has read access to the project
   * (either as the owning Developer, or as an assigned Contractor/Vendor, or SuperAdmin).
   */
  private async verifyProjectAccess(
    projectId: string,
    callerOrgId: string,
    callerUserId: string,
    isSuperAdmin = false
  ) {
    if (isSuperAdmin) return true;

    // 1. Is caller's org the owner?
    const isOwner = await prisma.project.findFirst({
      where: { id: projectId, organizationId: callerOrgId, isActive: true },
    });
    if (isOwner) return true;

    // 2. Is caller's org assigned to the project?
    const isAssignedOrg = await prisma.projectOrganizationAssignment.findFirst({
      where: {
        projectId,
        organizationId: callerOrgId,
        status: AssignmentStatus.ACTIVE,
      },
    });
    if (isAssignedOrg) return true;

    // 3. Is the individual user a direct project member?
    const isDirectMember = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: callerUserId,
        status: AssignmentStatus.ACTIVE,
      },
    });
    if (isDirectMember) return true;

    throw new ForbiddenError('Access denied: You do not have access to this project.');
  }

  /**
   * Assign an external organization (Contractor or Vendor) to a Project.
   * Only the owning Developer organization can assign contractors/vendors.
   */
  public async assignOrganization(
    projectId: string,
    callerOrgId: string,
    callerUserId: string,
    dto: AssignOrganizationDTO,
    isSuperAdmin = false
  ): Promise<ProjectOrganizationAssignment> {
    await this.getOwnedProject(projectId, callerOrgId, isSuperAdmin);

    // Verify assigned organization exists and is active
    const targetOrg = await prisma.organization.findUnique({
      where: { id: dto.organizationId },
    });

    if (!targetOrg || !targetOrg.isActive) {
      throw new NotFoundError('The specified organization does not exist or is inactive.');
    }

    // Verify assignmentType matches organization type
    if (dto.assignmentType === 'CONTRACTOR' && targetOrg.type !== 'CONTRACTOR') {
      throw new ValidationError(
        `Cannot assign organization '${targetOrg.name}' as CONTRACTOR because its organization type is ${targetOrg.type}.`
      );
    }
    if (dto.assignmentType === 'VENDOR' && targetOrg.type !== 'VENDOR') {
      throw new ValidationError(
        `Cannot assign organization '${targetOrg.name}' as VENDOR because its organization type is ${targetOrg.type}.`
      );
    }

    // Prevent duplicate assignment
    const existing = await prisma.projectOrganizationAssignment.findUnique({
      where: {
        projectId_organizationId: {
          projectId,
          organizationId: dto.organizationId,
        },
      },
    });

    if (existing) {
      throw new ConflictError('This organization is already assigned to this project.');
    }

    return prisma.projectOrganizationAssignment.create({
      data: {
        projectId,
        organizationId: dto.organizationId,
        assignedById: callerUserId,
        assignmentType: dto.assignmentType,
        status: AssignmentStatus.ACTIVE,
        scopeOfWork: dto.scopeOfWork || null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, type: true },
        },
      },
    });
  }

  /**
   * List all organizations assigned to a project.
   */
  public async listProjectOrganizations(
    projectId: string,
    callerOrgId: string,
    callerUserId: string,
    isSuperAdmin = false
  ): Promise<ProjectOrganizationAssignment[]> {
    await this.verifyProjectAccess(projectId, callerOrgId, callerUserId, isSuperAdmin);

    return prisma.projectOrganizationAssignment.findMany({
      where: { projectId },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, type: true },
        },
        assignedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update an organization assignment (e.g. suspend or terminate contract).
   * Only owning Developer can update this.
   */
  public async updateOrganizationAssignment(
    projectId: string,
    targetOrgId: string,
    callerOrgId: string,
    dto: UpdateOrganizationAssignmentDTO,
    isSuperAdmin = false
  ): Promise<ProjectOrganizationAssignment> {
    await this.getOwnedProject(projectId, callerOrgId, isSuperAdmin);

    const assignment = await prisma.projectOrganizationAssignment.findUnique({
      where: {
        projectId_organizationId: {
          projectId,
          organizationId: targetOrgId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundError('Organization assignment not found for this project.');
    }

    return prisma.projectOrganizationAssignment.update({
      where: {
        projectId_organizationId: {
          projectId,
          organizationId: targetOrgId,
        },
      },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.scopeOfWork !== undefined ? { scopeOfWork: dto.scopeOfWork } : {}),
        ...(dto.startDate !== undefined
          ? { startDate: dto.startDate ? new Date(dto.startDate) : null }
          : {}),
        ...(dto.endDate !== undefined
          ? { endDate: dto.endDate ? new Date(dto.endDate) : null }
          : {}),
      },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, type: true },
        },
      },
    });
  }

  /**
   * Assign an individual user (employee, supervisor, PM, buyer) to a project.
   * Permission Rules:
   *  - DEVELOPER: can assign internal team, buyers, or contractor personnel.
   *  - CONTRACTOR: can assign their own organization's employees as SITE_SUPERVISOR or SITE_ENGINEER.
   */
  public async assignMember(
    projectId: string,
    callerOrgId: string,
    callerUserId: string,
    callerRole: Role,
    dto: AssignProjectMemberDTO,
    isSuperAdmin = false
  ): Promise<ProjectMember> {
    // 1. Permission checks
    let assignedUserOrgId = dto.organizationId || callerOrgId;

    if (callerRole === Role.DEVELOPER || isSuperAdmin) {
      await this.getOwnedProject(projectId, callerOrgId, isSuperAdmin);
    } else if (callerRole === Role.CONTRACTOR) {
      // Contractor must have an active assignment to this project
      const hasAssignment = await prisma.projectOrganizationAssignment.findFirst({
        where: {
          projectId,
          organizationId: callerOrgId,
          status: AssignmentStatus.ACTIVE,
          assignmentType: 'CONTRACTOR',
        },
      });

      if (!hasAssignment) {
        throw new ForbiddenError(
          'Your contractor organization is not actively assigned to this project.'
        );
      }

      // Contractors may only assign SITE_SUPERVISOR or SITE_ENGINEER
      if (
        dto.role !== ProjectMemberRole.SITE_SUPERVISOR &&
        dto.role !== ProjectMemberRole.SITE_ENGINEER
      ) {
        throw new ForbiddenError(
          'Contractors can only assign SITE_SUPERVISOR or SITE_ENGINEER roles.'
        );
      }

      assignedUserOrgId = callerOrgId;
    } else {
      throw new ForbiddenError('You do not have permission to assign members to projects.');
    }

    // 2. Target user must exist and belong to the specified organization
    const targetUserMembership = await prisma.organizationMembership.findFirst({
      where: {
        userId: dto.userId,
        organizationId: assignedUserOrgId,
        status: 'ACTIVE',
      },
    });

    if (!targetUserMembership) {
      throw new ValidationError(
        'The specified user is not an active member of the designated organization.'
      );
    }

    // 3. Prevent duplicate project membership
    const existing = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: dto.userId,
        },
      },
    });

    if (existing) {
      throw new ConflictError('This user is already assigned to this project.');
    }

    return prisma.projectMember.create({
      data: {
        projectId,
        userId: dto.userId,
        organizationId: assignedUserOrgId,
        assignedById: callerUserId,
        role: dto.role,
        status: AssignmentStatus.ACTIVE,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        organization: {
          select: { id: true, name: true, slug: true, type: true },
        },
      },
    });
  }

  /**
   * List members assigned to a project.
   */
  public async listProjectMembers(
    projectId: string,
    callerOrgId: string,
    callerUserId: string,
    isSuperAdmin = false
  ): Promise<ProjectMember[]> {
    await this.verifyProjectAccess(projectId, callerOrgId, callerUserId, isSuperAdmin);

    return prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        organization: {
          select: { id: true, name: true, slug: true, type: true },
        },
        assignedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Remove / Deactivate a member from a project.
   */
  public async removeMember(
    projectId: string,
    targetUserId: string,
    callerOrgId: string,
    callerRole: Role,
    isSuperAdmin = false
  ): Promise<{ success: boolean; message: string }> {
    if (callerRole === Role.DEVELOPER || isSuperAdmin) {
      await this.getOwnedProject(projectId, callerOrgId, isSuperAdmin);
    } else if (callerRole === Role.CONTRACTOR) {
      // Contractor can only remove members belonging to their own organization
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: targetUserId } },
      });
      if (!member || member.organizationId !== callerOrgId) {
        throw new ForbiddenError(
          'Contractors can only remove members belonging to their own organization.'
        );
      }
    } else {
      throw new ForbiddenError('You do not have permission to remove project members.');
    }

    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });

    if (!member) {
      throw new NotFoundError('Project member not found.');
    }

    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });

    return { success: true, message: 'Project member removed successfully.' };
  }
}

export const assignmentService = new AssignmentService();

