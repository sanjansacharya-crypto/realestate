import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { app } from '../src/app';
import { prisma } from '../src/config/db';
import { env } from '../src/config/env';

describe('Phase 4: Authentication & Session Management', () => {
  const createdUserIds: string[] = [];
  const createdOrgIds: string[] = [];

  const uniqueSuffix = randomUUID().substring(0, 8);
  const testUser = {
    email: `test-auth-${uniqueSuffix}@example.com`,
    password: 'SecurePassword123!',
    firstName: 'Alice',
    lastName: 'Developer',
    organizationName: `Test Org ${uniqueSuffix}`,
  };

  let validAccessToken = '';
  let validRefreshToken = '';

  beforeAll(async () => {
    // Warm up the database connection pool before tests run
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up created entities in reverse dependency order
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
    if (createdOrgIds.length > 0) {
      await prisma.organization.deleteMany({
        where: { id: { in: createdOrgIds } },
      });
    }
  });

  // -------------------------------------------------------------------------
  // 1. Registration
  // -------------------------------------------------------------------------
  describe('POST /api/v1/auth/register', () => {
    it('successfully registers a new user and provisions default organization', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const { user, tokens } = res.body.data;
      expect(user).toHaveProperty('id');
      expect(user.email).toBe(testUser.email.toLowerCase());
      expect(user.firstName).toBe(testUser.firstName);
      expect(user.lastName).toBe(testUser.lastName);
      expect(user).not.toHaveProperty('passwordHash'); // NEVER return passwordHash

      // Check organization membership
      expect(user.memberships).toHaveLength(1);
      expect(user.memberships[0].role).toBe('DEVELOPER');
      expect(user.memberships[0].organization.name).toBe(testUser.organizationName);

      // Check tokens
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');

      createdUserIds.push(user.id);
      createdOrgIds.push(user.memberships[0].organization.id);

      // Verify password was hashed in the database (not stored as plaintext)
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser?.passwordHash).not.toBe(testUser.password);
      expect(dbUser?.passwordHash.startsWith('$2')).toBe(true); // bcrypt prefix
    });

    it('rejects duplicate email with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/already exists/i);
    });

    it('rejects registration with weak password (missing number/uppercase)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `weak-${randomUUID().substring(0, 8)}@example.com`,
          password: 'simplepassword',
          firstName: 'Bob',
          lastName: 'Smith',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toHaveProperty('details');
    });
  });

  // -------------------------------------------------------------------------
  // 2. Login
  // -------------------------------------------------------------------------
  describe('POST /api/v1/auth/login', () => {
    it('authenticates valid credentials and returns tokens without passwordHash', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { user, tokens } = res.body.data;
      expect(user.id).toBe(createdUserIds[0]);
      expect(user).not.toHaveProperty('passwordHash');
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');

      // Save tokens for subsequent tests
      validAccessToken = tokens.accessToken;
      validRefreshToken = tokens.refreshToken;
    });

    it('rejects invalid password with generic 401 error', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword999!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('rejects nonexistent email with generic 401 error (prevents enumeration)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: `nonexistent-${randomUUID().substring(0, 8)}@example.com`,
          password: 'SomePassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password');
    });
  });

  // -------------------------------------------------------------------------
  // 3. Protected Route & Access Token Verification (GET /auth/me)
  // -------------------------------------------------------------------------
  describe('GET /api/v1/auth/me', () => {
    it('allows access with a valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${validAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe(createdUserIds[0]);
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('rejects request without Authorization header with 401', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Authentication required/i);
    });

    it('rejects request with malformed Authorization header with 401', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'InvalidFormat123');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Invalid Authorization format/i);
    });

    it('rejects request with invalid signature token with 401', async () => {
      const forgedToken = jwt.sign(
        { sub: createdUserIds[0], email: testUser.email },
        'completely-wrong-secret-key-123456789'
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Invalid access token/i);
    });

    it('rejects request with expired access token with 401', async () => {
      const expiredToken = jwt.sign(
        { sub: createdUserIds[0], email: testUser.email },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/expired/i);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Token Refresh & Rotation
  // -------------------------------------------------------------------------
  describe('POST /api/v1/auth/refresh', () => {
    let rotatedRefreshToken = '';

    it('successfully refreshes tokens and rotates the refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: validRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');

      // The new refresh token must be different from the old one (rotation)
      expect(res.body.data.refreshToken).not.toBe(validRefreshToken);
      rotatedRefreshToken = res.body.data.refreshToken;
    });

    it('rejects reuse of the previous (already revoked) refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: validRefreshToken });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Invalid or expired refresh token/i);
    });

    it('rejects invalid or non-existent refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'completely-fake-refresh-token' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Invalid or expired refresh token/i);
    });

    // -------------------------------------------------------------------------
    // 5. Logout & Revocation
    // -------------------------------------------------------------------------
    describe('POST /api/v1/auth/logout', () => {
      it('revokes the refresh token on logout', async () => {
        const res = await request(app)
          .post('/api/v1/auth/logout')
          .send({ refreshToken: rotatedRefreshToken });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.message).toMatch(/Logged out successfully/i);

        // Attempting to use the revoked refresh token must now fail
        const refreshRes = await request(app)
          .post('/api/v1/auth/refresh')
          .send({ refreshToken: rotatedRefreshToken });

        expect(refreshRes.status).toBe(401);
      });
    });
  });
});
