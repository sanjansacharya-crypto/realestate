import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Role, MembershipStatus, OrganizationType } from '@prisma/client';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../common/errors/appError';
import {
  AuthTokens,
  JwtAccessTokenPayload,
  RegisterDTO,
  LoginDTO,
  SafeUser,
} from './auth.types';

const BCRYPT_SALT_ROUNDS = 12;

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const randomSuffix = crypto.randomBytes(3).toString('hex');
  return `${base || 'org'}-${randomSuffix}`;
}

export class AuthService {
  /**
   * Hashes a password securely using bcrypt.
   */
  public async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }

  /**
   * Verifies a plain text password against a bcrypt hash.
   */
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generates a short-lived JWT access token and a cryptographically secure
   * opaque refresh token stored as a SHA-256 hash in the database.
   */
  public async generateTokens(user: { id: string; email: string }): Promise<AuthTokens> {
    // 1. Sign short-lived JWT access token
    const payload: JwtAccessTokenPayload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    } as jwt.SignOptions);

    // 2. Generate cryptographically random refresh token
    const rawRefreshToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);

    // 3. Persist hashed refresh token
    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    };
  }

  /**
   * Registers a new user account. Optionally provisions an organization if requested.
   */
  public async register(dto: RegisterDTO): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const existing = await prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictError('An account with this email address already exists');
    }

    const passwordHash = await this.hashPassword(dto.password);

    let createdUser;

    if (dto.organizationName) {
      // Create user and organization atomically
      const slug = generateSlug(dto.organizationName);

      createdUser = await prisma.$transaction(
        async (tx) => {
          const user = await tx.user.create({
            data: {
              email: dto.email.toLowerCase(),
              passwordHash,
              firstName: dto.firstName,
              lastName: dto.lastName,
              phoneNumber: dto.phoneNumber || null,
            },
          });

          const org = await tx.organization.create({
            data: {
              name: dto.organizationName as string,
              slug,
              type: OrganizationType.DEVELOPER,
            },
          });

          const membership = await tx.organizationMembership.create({
            data: {
              userId: user.id,
              organizationId: org.id,
              role: Role.DEVELOPER,
              status: MembershipStatus.ACTIVE,
              isDefault: true,
            },
            include: {
              organization: true,
            },
          });

          return {
            ...user,
            memberships: [membership],
          };
        },
        {
          maxWait: 20000,
          timeout: 30000,
        }
      );
    } else {
      createdUser = await prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phoneNumber: dto.phoneNumber || null,
        },
        include: {
          memberships: {
            include: {
              organization: true,
            },
          },
        },
      });
    }

    const tokens = await this.generateTokens({
      id: createdUser.id,
      email: createdUser.email,
    });

    return {
      user: this.toSafeUser(createdUser),
      tokens,
    };
  }

  /**
   * Authenticates user with email and password. Returns user and tokens.
   */
  public async login(dto: LoginDTO): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const user = await prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    // Use generic error to avoid leaking account existence
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated. Please contact support.');
    }

    const isPasswordValid = await this.verifyPassword(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokens = await this.generateTokens({
      id: user.id,
      email: user.email,
    });

    return {
      user: this.toSafeUser(user),
      tokens,
    };
  }

  /**
   * Rotates a refresh token and generates a new pair of access & refresh tokens.
   */
  public async refreshTokens(rawRefreshToken: string): Promise<AuthTokens> {
    const tokenHash = hashToken(rawRefreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !storedToken ||
      storedToken.revoked ||
      storedToken.expiresAt < new Date() ||
      !storedToken.user.isActive
    ) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Revoke the old token (rotation policy)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    // Issue a new token pair
    return this.generateTokens({
      id: storedToken.user.id,
      email: storedToken.user.email,
    });
  }

  /**
   * Revokes refresh token(s) to log the user out.
   */
  public async logout(rawRefreshToken?: string, userId?: string): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revoked: false },
        data: { revoked: true },
      });
    } else if (userId) {
      await prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
      });
    }
  }

  /**
   * Retrieves user profile and active memberships.
   */
  public async getMe(userId: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { status: MembershipStatus.ACTIVE },
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new NotFoundError('User not found or inactive');
    }

    return this.toSafeUser(user);
  }

  /**
   * Removes sensitive fields like passwordHash from user object.
   */
  public toSafeUser(user: any): SafeUser {
    const { passwordHash: _hash, ...safe } = user;
    return safe as SafeUser;
  }
}

export const authService = new AuthService();
