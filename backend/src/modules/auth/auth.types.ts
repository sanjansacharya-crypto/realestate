import { Role, MembershipStatus, OrganizationType } from '@prisma/client';

export interface JwtAccessTokenPayload {
  sub: string; // User ID
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface SafeOrganization {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  isActive: boolean;
}

export interface SafeMembership {
  id: string;
  role: Role;
  status: MembershipStatus;
  isDefault: boolean;
  organization: SafeOrganization;
}

export interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  memberships?: SafeMembership[];
}

export interface RegisterDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  organizationName?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

// Extend Express Request interface to include authenticated user and tenant context
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SafeUser;
      organization?: SafeOrganization;
      membership?: SafeMembership;
    }
  }
}
