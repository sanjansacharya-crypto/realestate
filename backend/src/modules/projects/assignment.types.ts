import { AssignmentType, AssignmentStatus, ProjectMemberRole } from '@prisma/client';

export interface AssignOrganizationDTO {
  organizationId: string;
  assignmentType: AssignmentType;
  scopeOfWork?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateOrganizationAssignmentDTO {
  status?: AssignmentStatus;
  scopeOfWork?: string;
  startDate?: string;
  endDate?: string;
}

export interface AssignProjectMemberDTO {
  userId: string;
  role: ProjectMemberRole;
  organizationId?: string; // Optional if inferred from user's primary organization
}

export interface UpdateProjectMemberDTO {
  role?: ProjectMemberRole;
  status?: AssignmentStatus;
}

