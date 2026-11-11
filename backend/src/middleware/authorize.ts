import { Request, Response, NextFunction } from 'express';
import { Role, MembershipStatus } from '@prisma/client';
import { UnauthorizedError, ForbiddenError, ValidationError } from '../common/errors/appError';
import { SafeUser, SafeMembership } from '../modules/auth/auth.types';

export interface OrganizationScopeOptions {
  /**
   * Source from which to extract the organizationId:
   * - 'auto': searches params -> header ('x-organization-id') -> query -> body -> user default org
   * - 'params': req.params[paramName]
   * - 'header': req.headers['x-organization-id']
   * - 'query': req.query[paramName]
   * - 'body': req.body[paramName]
   */
  source?: 'auto' | 'params' | 'header' | 'query' | 'body';
  /**
   * Name of parameter (defaults to 'organizationId')
   */
  paramName?: string;
  /**
   * If true, allows platform superadmins to access without an explicit membership
   */
  allowSuperAdminBypass?: boolean;
}

/**
 * Helper to get active membership in an organization for a given user.
 */
export function getActiveMembership(
  user: SafeUser,
  organizationId: string
): SafeMembership | undefined {
  if (!user.memberships) {
    return undefined;
  }
  return user.memberships.find(
    (m) => m.organization.id === organizationId && m.status === MembershipStatus.ACTIVE
  );
}

/**
 * Helper to check whether a user is an active member of an organization.
 */
export function isMemberOf(user: SafeUser, organizationId: string): boolean {
  return !!getActiveMembership(user, organizationId);
}

/**
 * Helper to check whether a user has a specific role in an organization.
 */
export function hasRoleInOrganization(
  user: SafeUser,
  organizationId: string,
  role: Role
): boolean {
  const membership = getActiveMembership(user, organizationId);
  return membership?.role === role;
}

/**
 * Extracts organization ID from incoming request based on options.
 */
function resolveOrganizationId(req: Request, options: OrganizationScopeOptions): string | undefined {
  const paramName = options.paramName || 'organizationId';
  const source = options.source || 'auto';

  if (source === 'params') {
    return req.params[paramName];
  }

  if (source === 'header') {
    const headerVal = req.headers['x-organization-id'];
    return Array.isArray(headerVal) ? headerVal[0] : headerVal;
  }

  if (source === 'query') {
    const queryVal = req.query[paramName];
    return typeof queryVal === 'string' ? queryVal : undefined;
  }

  if (source === 'body') {
    return req.body?.[paramName];
  }

  // 'auto' mode: cascade through params, header, query, body, and finally user's default/sole membership
  if (req.params?.[paramName]) {
    return req.params[paramName];
  }

  const headerVal = req.headers['x-organization-id'];
  if (headerVal) {
    return Array.isArray(headerVal) ? headerVal[0] : headerVal;
  }

  if (typeof req.query?.[paramName] === 'string') {
    return req.query[paramName] as string;
  }

  if (req.body?.[paramName]) {
    return req.body[paramName];
  }

  // Fallback: If user has a default membership or exactly one active membership, auto-select it
  if (req.user?.memberships && req.user.memberships.length > 0) {
    const defaultMembership = req.user.memberships.find((m) => m.isDefault && m.status === MembershipStatus.ACTIVE);
    if (defaultMembership) {
      return defaultMembership.organization.id;
    }
    const firstActive = req.user.memberships.find((m) => m.status === MembershipStatus.ACTIVE);
    if (firstActive) {
      return firstActive.organization.id;
    }
  }

  return undefined;
}

/**
 * Middleware: Enforces that the request is made by an authorized member of the specified organization.
 * 
 * Prevents cross-tenant access and ID-swapping attacks:
 * 1. Checks authenticated user.
 * 2. Extracts requested target organization ID (from params, headers, query, or body).
 * 3. Checks if user's verified memberships include this organization with an ACTIVE status.
 * 4. If not matched, immediately throws ForbiddenError (403).
 * 5. Attaches the validated req.organization and req.membership to the Request for downstream handlers.
 */
export function requireOrganization(options: OrganizationScopeOptions = {}) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const targetOrgId = resolveOrganizationId(req, options);

      if (!targetOrgId) {
        throw new ValidationError(
          `Organization context is required. Provide '${options.paramName || 'organizationId'}' in path/query/body or 'x-organization-id' header.`
        );
      }

      // Allow superadmin bypass if configured
      if (req.user.isSuperAdmin && options.allowSuperAdminBypass !== false) {
        // If superadmin has an explicit membership in this org, attach it
        const matchingMembership = req.user.memberships?.find(
          (m) => m.organization.id === targetOrgId
        );
        if (matchingMembership) {
          req.organization = matchingMembership.organization;
          req.membership = matchingMembership;
        } else {
          // Virtual context for platform admin
          req.organization = {
            id: targetOrgId,
            name: 'Platform Managed Organization',
            slug: 'platform-managed',
            type: 'DEVELOPER',
            isActive: true,
          };
          req.membership = {
            id: 'superadmin-virtual-membership',
            role: Role.PLATFORM_ADMIN,
            status: MembershipStatus.ACTIVE,
            isDefault: false,
            organization: req.organization,
          };
        }
        return next();
      }

      // Check if user has membership in target organization
      const memberships = req.user.memberships || [];
      const membership = memberships.find((m) => m.organization.id === targetOrgId);

      if (!membership) {
        throw new ForbiddenError('Access denied: You do not have access to this organization.');
      }

      if (membership.status !== MembershipStatus.ACTIVE) {
        throw new ForbiddenError(
          `Access denied: Your membership in this organization is ${membership.status.toLowerCase()}.`
        );
      }

      if (!membership.organization.isActive) {
        throw new ForbiddenError('Access denied: This organization is currently deactivated.');
      }

      // Attach verified tenant context to request
      req.organization = membership.organization;
      req.membership = membership;

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware: Requires that the authenticated user has at least one of the specified roles.
 * Can be combined after requireOrganization() to enforce role within that tenant,
 * or used alone across the user's active memberships.
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Platform superadmin bypasses role requirements
      if (req.user.isSuperAdmin) {
        return next();
      }

      // If tenant membership is already established by requireOrganization:
      if (req.membership) {
        if (!allowedRoles.includes(req.membership.role)) {
          throw new ForbiddenError(
            `Access denied: Role '${req.membership.role}' does not have permission for this resource. Required role(s): ${allowedRoles.join(', ')}.`
          );
        }
        return next();
      }

      // Otherwise, check if user has at least one active membership with any of the allowed roles
      const hasAllowedRole = req.user.memberships?.some(
        (m) => m.status === MembershipStatus.ACTIVE && allowedRoles.includes(m.role)
      );

      if (!hasAllowedRole) {
        throw new ForbiddenError(
          `Access denied: Insufficient permissions. Required role(s): ${allowedRoles.join(', ')}.`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware: Requires Platform Super Admin privileges or PLATFORM_ADMIN role.
 */
export function requirePlatformAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (req.user.isSuperAdmin) {
      return next();
    }

    const isPlatformAdmin = req.user.memberships?.some(
      (m) => m.status === MembershipStatus.ACTIVE && m.role === Role.PLATFORM_ADMIN
    );

    if (!isPlatformAdmin) {
      throw new ForbiddenError('Access denied: Platform administrator privileges required.');
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Combined Middleware: Requires membership in the organization AND specific role(s) within that organization.
 */
export function requireOrganizationRole(roles: Role[], options: OrganizationScopeOptions = {}) {
  const orgMiddleware = requireOrganization(options);
  const roleMiddleware = requireRole(...roles);

  return (req: Request, res: Response, next: NextFunction): void => {
    orgMiddleware(req, res, (orgErr) => {
      if (orgErr) {
        return next(orgErr);
      }
      roleMiddleware(req, res, next);
    });
  };
}

