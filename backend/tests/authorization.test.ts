import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { Role, MembershipStatus, OrganizationType } from '@prisma/client';
import {
  requireRole,
  requirePlatformAdmin,
  requireOrganization,
  requireOrganizationRole,
  isMemberOf,
  getActiveMembership,
  hasRoleInOrganization,
} from '../src/middleware/authorize';
import { SafeUser } from '../src/modules/auth/auth.types';
import { ForbiddenError, UnauthorizedError, ValidationError } from '../src/common/errors/appError';

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

const orgAlpha = {
  id: 'org-alpha-1111-1111-1111-111111111111',
  name: 'Alpha Developments',
  slug: 'alpha-dev',
  type: OrganizationType.DEVELOPER,
  isActive: true,
};

const orgBeta = {
  id: 'org-beta-2222-2222-2222-222222222222',
  name: 'Beta Construction Co',
  slug: 'beta-const',
  type: OrganizationType.CONTRACTOR,
  isActive: true,
};

const orgSuspended = {
  id: 'org-inactive-3333-3333-333333333333',
  name: 'Suspended Realty',
  slug: 'suspended-realty',
  type: OrganizationType.DEVELOPER,
  isActive: false,
};

// Developer User: Member of Org Alpha only
const developerUser: SafeUser = {
  id: 'user-dev-001',
  email: 'developer@alpha.com',
  firstName: 'Dev',
  lastName: 'Lead',
  phoneNumber: null,
  isSuperAdmin: false,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  memberships: [
    {
      id: 'mem-001',
      role: Role.DEVELOPER,
      status: MembershipStatus.ACTIVE,
      isDefault: true,
      organization: orgAlpha,
    },
  ],
};

// Buyer User: Member of Org Alpha as Buyer
const buyerUser: SafeUser = {
  id: 'user-buyer-001',
  email: 'buyer@example.com',
  firstName: 'Jane',
  lastName: 'Buyer',
  phoneNumber: null,
  isSuperAdmin: false,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  memberships: [
    {
      id: 'mem-002',
      role: Role.BUYER,
      status: MembershipStatus.ACTIVE,
      isDefault: true,
      organization: orgAlpha,
    },
  ],
};

// Multi-Org User: Contractor in Org Beta, Employee in Org Alpha
const multiOrgUser: SafeUser = {
  id: 'user-contractor-001',
  email: 'contractor@beta.com',
  firstName: 'Bob',
  lastName: 'Builder',
  phoneNumber: null,
  isSuperAdmin: false,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  memberships: [
    {
      id: 'mem-003',
      role: Role.CONTRACTOR,
      status: MembershipStatus.ACTIVE,
      isDefault: true,
      organization: orgBeta,
    },
    {
      id: 'mem-004',
      role: Role.EMPLOYEE,
      status: MembershipStatus.ACTIVE,
      isDefault: false,
      organization: orgAlpha,
    },
  ],
};

// Suspended User: Member of Org Alpha, but status is SUSPENDED
const suspendedMemberUser: SafeUser = {
  id: 'user-suspended-001',
  email: 'suspended@alpha.com',
  firstName: 'Suspended',
  lastName: 'Member',
  phoneNumber: null,
  isSuperAdmin: false,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  memberships: [
    {
      id: 'mem-005',
      role: Role.DEVELOPER,
      status: MembershipStatus.SUSPENDED,
      isDefault: true,
      organization: orgAlpha,
    },
  ],
};

// User belonging to an inactive organization
const deactivatedOrgUser: SafeUser = {
  id: 'user-deactivated-org-001',
  email: 'user@suspended-realty.com',
  firstName: 'Org',
  lastName: 'Deactivated',
  phoneNumber: null,
  isSuperAdmin: false,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  memberships: [
    {
      id: 'mem-006',
      role: Role.DEVELOPER,
      status: MembershipStatus.ACTIVE,
      isDefault: true,
      organization: orgSuspended,
    },
  ],
};

// Platform Super Admin
const superAdminUser: SafeUser = {
  id: 'user-admin-001',
  email: 'admin@platform.com',
  firstName: 'Platform',
  lastName: 'Admin',
  phoneNumber: null,
  isSuperAdmin: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  memberships: [],
};

// ---------------------------------------------------------------------------
// Helper to simulate Express middleware execution
// ---------------------------------------------------------------------------

function executeMiddleware(
  middleware: (req: Request, res: Response, next: NextFunction) => void,
  req: Partial<Request>
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!req.params) req.params = {};
    if (!req.query) req.query = {};
    if (!req.headers) req.headers = {};
    if (!req.body) req.body = {};

    const res = {} as Response;
    const next: NextFunction = (err?: any) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    };

    try {
      middleware(req as Request, res, next);
    } catch (err) {
      reject(err);
    }
  });
}

// ---------------------------------------------------------------------------
// Tests: Phase 5 - Authorization and Tenant Isolation
// ---------------------------------------------------------------------------

describe('Phase 5: Authorization & Tenant Isolation', () => {
  describe('Authentication Check', () => {
    it('rejects unauthenticated requests with UnauthorizedError (401)', async () => {
      const middleware = requireRole(Role.DEVELOPER);
      await expect(executeMiddleware(middleware, { user: undefined })).rejects.toThrow(
        UnauthorizedError
      );
    });

    it('rejects unauthenticated requests in requireOrganization with UnauthorizedError (401)', async () => {
      const middleware = requireOrganization();
      await expect(
        executeMiddleware(middleware, {
          user: undefined,
          params: { organizationId: orgAlpha.id },
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('rejects unauthenticated requests in requirePlatformAdmin with UnauthorizedError (401)', async () => {
      await expect(executeMiddleware(requirePlatformAdmin, { user: undefined })).rejects.toThrow(
        UnauthorizedError
      );
    });
  });

  describe('Role-Based Authorization (requireRole)', () => {
    it('allows access when user has the required role', async () => {
      const middleware = requireRole(Role.DEVELOPER);
      await expect(executeMiddleware(middleware, { user: developerUser })).resolves.toBeUndefined();
    });

    it('allows access when user has one of multiple allowed roles', async () => {
      const middleware = requireRole(Role.DEVELOPER, Role.PLATFORM_ADMIN);
      await expect(executeMiddleware(middleware, { user: developerUser })).resolves.toBeUndefined();
    });

    it('denies access with ForbiddenError (403) when user lacks the required role', async () => {
      const middleware = requireRole(Role.DEVELOPER);
      await expect(executeMiddleware(middleware, { user: buyerUser })).rejects.toThrow(
        ForbiddenError
      );
    });

    it('allows platform superadmin to bypass role checks', async () => {
      const middleware = requireRole(Role.DEVELOPER);
      await expect(executeMiddleware(middleware, { user: superAdminUser })).resolves.toBeUndefined();
    });

    it('checks role against req.membership when tenant context is pre-established', async () => {
      const middleware = requireRole(Role.CONTRACTOR);
      // Multi-org user is a CONTRACTOR in Org Beta, but an EMPLOYEE in Org Alpha
      const employeeMembershipInAlpha = multiOrgUser.memberships![1];

      // With Org Alpha context (EMPLOYEE), contractor-only route should be rejected
      await expect(
        executeMiddleware(middleware, {
          user: multiOrgUser,
          membership: employeeMembershipInAlpha,
        })
      ).rejects.toThrow(ForbiddenError);

      // With Org Beta context (CONTRACTOR), contractor-only route should pass
      const contractorMembershipInBeta = multiOrgUser.memberships![0];
      await expect(
        executeMiddleware(middleware, {
          user: multiOrgUser,
          membership: contractorMembershipInBeta,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('Platform Admin Authorization (requirePlatformAdmin)', () => {
    it('allows user with isSuperAdmin = true', async () => {
      await expect(
        executeMiddleware(requirePlatformAdmin, { user: superAdminUser })
      ).resolves.toBeUndefined();
    });

    it('denies normal developer users with ForbiddenError (403)', async () => {
      await expect(
        executeMiddleware(requirePlatformAdmin, { user: developerUser })
      ).rejects.toThrow(ForbiddenError);
    });

    it('denies buyer users with ForbiddenError (403)', async () => {
      await expect(
        executeMiddleware(requirePlatformAdmin, { user: buyerUser })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('Tenant Boundary Enforcement & Anti-Tampering (requireOrganization)', () => {
    it('PREVENTS ID-SWAPPING: rejects user accessing an organization they do not belong to', async () => {
      const middleware = requireOrganization({ source: 'params' });

      // Developer belongs to Org Alpha, but maliciously targets Org Beta in URL params
      const req: Partial<Request> = {
        user: developerUser,
        params: { organizationId: orgBeta.id },
      };

      await expect(executeMiddleware(middleware, req)).rejects.toThrow(ForbiddenError);
      await expect(executeMiddleware(middleware, req)).rejects.toThrow(
        'Access denied: You do not have access to this organization.'
      );
    });

    it('allows access when user belongs to the requested organization and populates tenant context', async () => {
      const middleware = requireOrganization({ source: 'params' });

      const req: Partial<Request> = {
        user: developerUser,
        params: { organizationId: orgAlpha.id },
      };

      await executeMiddleware(middleware, req);

      // Verify tenant context was bound to the request
      expect(req.organization).toBeDefined();
      expect(req.organization?.id).toBe(orgAlpha.id);
      expect(req.membership).toBeDefined();
      expect(req.membership?.role).toBe(Role.DEVELOPER);
    });

    it('PREVENTS HEADER TAMPERING: rejects request when X-Organization-Id header points to foreign org', async () => {
      const middleware = requireOrganization({ source: 'header' });

      const req: Partial<Request> = {
        user: developerUser,
        headers: { 'x-organization-id': orgBeta.id },
      };

      await expect(executeMiddleware(middleware, req)).rejects.toThrow(ForbiddenError);
    });

    it('allows access when X-Organization-Id matches user membership', async () => {
      const middleware = requireOrganization({ source: 'header' });

      const req: Partial<Request> = {
        user: developerUser,
        headers: { 'x-organization-id': orgAlpha.id },
      };

      await executeMiddleware(middleware, req);
      expect(req.organization?.id).toBe(orgAlpha.id);
    });

    it('rejects access if user membership in target organization is SUSPENDED', async () => {
      const middleware = requireOrganization({ source: 'params' });

      const req: Partial<Request> = {
        user: suspendedMemberUser,
        params: { organizationId: orgAlpha.id },
      };

      await expect(executeMiddleware(middleware, req)).rejects.toThrow(ForbiddenError);
      await expect(executeMiddleware(middleware, req)).rejects.toThrow(
        'Access denied: Your membership in this organization is suspended.'
      );
    });

    it('rejects access if the target organization itself is deactivated', async () => {
      const middleware = requireOrganization({ source: 'params' });

      const req: Partial<Request> = {
        user: deactivatedOrgUser,
        params: { organizationId: orgSuspended.id },
      };

      await expect(executeMiddleware(middleware, req)).rejects.toThrow(ForbiddenError);
      await expect(executeMiddleware(middleware, req)).rejects.toThrow(
        'Access denied: This organization is currently deactivated.'
      );
    });

    it('allows platform superadmin to access any organization context', async () => {
      const middleware = requireOrganization({ source: 'params' });

      const req: Partial<Request> = {
        user: superAdminUser,
        params: { organizationId: orgBeta.id },
      };

      await executeMiddleware(middleware, req);
      expect(req.organization).toBeDefined();
      expect(req.organization?.id).toBe(orgBeta.id);
    });

    it('auto-resolves default organization when no explicit parameter is provided', async () => {
      const middleware = requireOrganization({ source: 'auto' });

      const req: Partial<Request> = {
        user: developerUser,
        params: {},
        headers: {},
      };

      await executeMiddleware(middleware, req);
      expect(req.organization?.id).toBe(orgAlpha.id);
    });

    it('throws ValidationError when no organization context can be found or inferred', async () => {
      const middleware = requireOrganization({ source: 'params' });

      const userWithNoMemberships: SafeUser = {
        ...developerUser,
        memberships: [],
      };

      const req: Partial<Request> = {
        user: userWithNoMemberships,
        params: {},
      };

      await expect(executeMiddleware(middleware, req)).rejects.toThrow(ValidationError);
    });
  });

  describe('Combined Tenant + Role Isolation (requireOrganizationRole)', () => {
    it('allows access when user belongs to org AND has permitted role in that org', async () => {
      const middleware = requireOrganizationRole([Role.DEVELOPER], { source: 'params' });

      const req: Partial<Request> = {
        user: developerUser,
        params: { organizationId: orgAlpha.id },
      };

      await executeMiddleware(middleware, req);
      expect(req.organization?.id).toBe(orgAlpha.id);
      expect(req.membership?.role).toBe(Role.DEVELOPER);
    });

    it('denies access (403) when user belongs to org but has wrong role in that org', async () => {
      const middleware = requireOrganizationRole([Role.DEVELOPER], { source: 'params' });

      // Jane is in Org Alpha, but is a BUYER, not a DEVELOPER
      const req: Partial<Request> = {
        user: buyerUser,
        params: { organizationId: orgAlpha.id },
      };

      await expect(executeMiddleware(middleware, req)).rejects.toThrow(ForbiddenError);
    });

    it('denies access (403) when user has the right role elsewhere but does NOT belong to the target org', async () => {
      const middleware = requireOrganizationRole([Role.DEVELOPER], { source: 'params' });

      // Developer has DEVELOPER role in Org Alpha, but attempts to access Org Beta
      const req: Partial<Request> = {
        user: developerUser,
        params: { organizationId: orgBeta.id },
      };

      await expect(executeMiddleware(middleware, req)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('Pure Helper Functions', () => {
    it('isMemberOf returns true only for active memberships', () => {
      expect(isMemberOf(developerUser, orgAlpha.id)).toBe(true);
      expect(isMemberOf(developerUser, orgBeta.id)).toBe(false);
      expect(isMemberOf(suspendedMemberUser, orgAlpha.id)).toBe(false); // Suspended is not active
    });

    it('getActiveMembership returns the matching membership or undefined', () => {
      const membership = getActiveMembership(developerUser, orgAlpha.id);
      expect(membership?.role).toBe(Role.DEVELOPER);

      expect(getActiveMembership(developerUser, orgBeta.id)).toBeUndefined();
    });

    it('hasRoleInOrganization checks role within specific organization', () => {
      expect(hasRoleInOrganization(multiOrgUser, orgBeta.id, Role.CONTRACTOR)).toBe(true);
      expect(hasRoleInOrganization(multiOrgUser, orgBeta.id, Role.DEVELOPER)).toBe(false);
      expect(hasRoleInOrganization(multiOrgUser, orgAlpha.id, Role.EMPLOYEE)).toBe(true);
      expect(hasRoleInOrganization(multiOrgUser, orgAlpha.id, Role.CONTRACTOR)).toBe(false);
    });
  });
});
