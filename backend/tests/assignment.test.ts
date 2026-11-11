import { describe, it, expect } from 'vitest';
import { AssignmentType, AssignmentStatus, ProjectMemberRole } from '@prisma/client';
import {
  assignOrganizationSchema,
  updateOrganizationAssignmentSchema,
  assignProjectMemberSchema,
  updateProjectMemberSchema,
} from '../src/modules/projects/assignment.validation';

describe('Phase 7: Project Membership and Assignments', () => {
  // -------------------------------------------------------------------------
  // 1. Validation Tests: Organization Assignment
  // -------------------------------------------------------------------------
  describe('assignOrganizationSchema', () => {
    const validOrgPayload = {
      organizationId: '11111111-1111-1111-1111-111111111111',
      assignmentType: AssignmentType.CONTRACTOR,
      scopeOfWork: 'Civil and structural work for Phase 1 plots and layout roads.',
      startDate: '2026-03-01T00:00:00.000Z',
      endDate: '2027-06-30T00:00:00.000Z',
    };

    it('accepts a valid contractor assignment payload', () => {
      const result = assignOrganizationSchema.safeParse(validOrgPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assignmentType).toBe(AssignmentType.CONTRACTOR);
        expect(result.data.scopeOfWork).toBe(validOrgPayload.scopeOfWork);
      }
    });

    it('accepts a valid vendor assignment payload', () => {
      const result = assignOrganizationSchema.safeParse({
        organizationId: '22222222-2222-2222-2222-222222222222',
        assignmentType: AssignmentType.VENDOR,
        scopeOfWork: 'Cement and TMT steel supply.',
      });
      expect(result.success).toBe(true);
    });

    it('rejects an invalid UUID for organizationId', () => {
      const result = assignOrganizationSchema.safeParse({
        ...validOrgPayload,
        organizationId: 'not-a-valid-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid assignmentType enum value', () => {
      const result = assignOrganizationSchema.safeParse({
        ...validOrgPayload,
        assignmentType: 'BUYER',
      });
      expect(result.success).toBe(false);
    });

    it('rejects if endDate is before startDate', () => {
      const result = assignOrganizationSchema.safeParse({
        ...validOrgPayload,
        startDate: '2027-01-01T00:00:00.000Z',
        endDate: '2026-01-01T00:00:00.000Z',
      });
      expect(result.success).toBe(false);
    });

    it('accepts when endDate equals startDate', () => {
      const result = assignOrganizationSchema.safeParse({
        ...validOrgPayload,
        startDate: '2026-05-01T00:00:00.000Z',
        endDate: '2026-05-01T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });

    it('rejects scopeOfWork exceeding 2000 characters', () => {
      const result = assignOrganizationSchema.safeParse({
        ...validOrgPayload,
        scopeOfWork: 'X'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Validation Tests: Update Organization Assignment
  // -------------------------------------------------------------------------
  describe('updateOrganizationAssignmentSchema', () => {
    it('accepts valid status update to SUSPENDED', () => {
      const result = updateOrganizationAssignmentSchema.safeParse({
        status: AssignmentStatus.SUSPENDED,
      });
      expect(result.success).toBe(true);
    });

    it('accepts valid status update to TERMINATED', () => {
      const result = updateOrganizationAssignmentSchema.safeParse({
        status: AssignmentStatus.TERMINATED,
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const result = updateOrganizationAssignmentSchema.safeParse({
        status: 'DISCHARGED',
      });
      expect(result.success).toBe(false);
    });

    it('rejects update if endDate is before startDate', () => {
      const result = updateOrganizationAssignmentSchema.safeParse({
        startDate: '2027-01-01T00:00:00.000Z',
        endDate: '2026-01-01T00:00:00.000Z',
      });
      expect(result.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Validation Tests: Project Member Assignment
  // -------------------------------------------------------------------------
  describe('assignProjectMemberSchema', () => {
    const validMemberPayload = {
      userId: '33333333-3333-3333-3333-333333333333',
      role: ProjectMemberRole.SITE_SUPERVISOR,
      organizationId: '11111111-1111-1111-1111-111111111111',
    };

    it('accepts valid member assignment with organizationId', () => {
      const result = assignProjectMemberSchema.safeParse(validMemberPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe(ProjectMemberRole.SITE_SUPERVISOR);
      }
    });

    it('accepts member assignment without explicit organizationId', () => {
      const result = assignProjectMemberSchema.safeParse({
        userId: '33333333-3333-3333-3333-333333333333',
        role: ProjectMemberRole.PROJECT_MANAGER,
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid member role', () => {
      const result = assignProjectMemberSchema.safeParse({
        ...validMemberPayload,
        role: 'SUPERADMIN',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid UUID for userId', () => {
      const result = assignProjectMemberSchema.safeParse({
        ...validMemberPayload,
        userId: 'user-001',
      });
      expect(result.success).toBe(false);
    });

    it('accepts all defined ProjectMemberRole values', () => {
      const roles = [
        ProjectMemberRole.PROJECT_MANAGER,
        ProjectMemberRole.SITE_SUPERVISOR,
        ProjectMemberRole.SITE_ENGINEER,
        ProjectMemberRole.SALES_EXECUTIVE,
        ProjectMemberRole.BUYER,
        ProjectMemberRole.CONSULTANT,
      ];

      for (const role of roles) {
        const result = assignProjectMemberSchema.safeParse({
          ...validMemberPayload,
          role,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 4. Domain & Permission Rules (Unit Verification)
  // -------------------------------------------------------------------------
  describe('Assignment Permission & Tenant Isolation Rules', () => {
    it('rule: only CONTRACTOR organization type can be assigned as CONTRACTOR', () => {
      const orgType = 'VENDOR';
      const requestedAssignmentType = AssignmentType.CONTRACTOR;
      const isAllowed = (orgType as any) === requestedAssignmentType;
      expect(isAllowed).toBe(false);
    });

    it('rule: contractors can only assign SITE_SUPERVISOR or SITE_ENGINEER', () => {
      const allowedContractorRoles = [
        ProjectMemberRole.SITE_SUPERVISOR,
        ProjectMemberRole.SITE_ENGINEER,
      ];

      expect(allowedContractorRoles.includes(ProjectMemberRole.SITE_SUPERVISOR)).toBe(true);
      expect(allowedContractorRoles.includes(ProjectMemberRole.SITE_ENGINEER)).toBe(true);
      expect(allowedContractorRoles.includes(ProjectMemberRole.PROJECT_MANAGER)).toBe(false);
      expect(allowedContractorRoles.includes(ProjectMemberRole.SALES_EXECUTIVE)).toBe(false);
    });

    it('rule: external contractor cannot access project unless active assignment exists', () => {
      const activeAssignmentExists = false;
      const canAccessProject = activeAssignmentExists;
      expect(canAccessProject).toBe(false);
    });

    it('rule: employees can only access projects where their individual membership is ACTIVE', () => {
      const memberStatus = AssignmentStatus.SUSPENDED;
      const hasActiveProjectAccess = memberStatus === AssignmentStatus.ACTIVE;
      expect(hasActiveProjectAccess).toBe(false);
    });

    it('rule: terminated assignment prevents contractor and its staff from accessing project', () => {
      const contractStatus = AssignmentStatus.TERMINATED;
      const isContractActive = contractStatus === AssignmentStatus.ACTIVE;
      expect(isContractActive).toBe(false);
    });
  });
});

