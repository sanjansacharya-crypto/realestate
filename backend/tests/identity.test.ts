import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/config/db';
import { MembershipStatus, OrganizationType, Role } from '@prisma/client';
import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueEmail() {
  return `test-${randomUUID()}@example.com`;
}

function uniqueSlug() {
  return `org-${randomUUID()}`;
}

// ---------------------------------------------------------------------------
// Phase 3 Database Constraint Tests
// ---------------------------------------------------------------------------

describe('Phase 3: Core Identity & Organization Constraints', () => {
  // Track created IDs for cleanup
  const createdUserIds: string[] = [];
  const createdOrgIds: string[] = [];

  beforeAll(async () => {
    // Warm up the Prisma connection pool before any test runs.
    // Without this, the first test hits a cold-start latency that exceeds the timeout.
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up test data in reverse dependency order
    await prisma.organizationMembership.deleteMany({
      where: {
        OR: [
          { userId: { in: createdUserIds } },
          { organizationId: { in: createdOrgIds } },
        ],
      },
    });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
  });

  // -------------------------------------------------------------------------
  // User model
  // -------------------------------------------------------------------------

  it('creates a user with required fields', async () => {
    const email = uniqueEmail();
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'argon2id-hash-placeholder',
        firstName: 'Alice',
        lastName: 'Smith',
      },
    });

    createdUserIds.push(user.id);

    expect(user.id).toBeTruthy();
    expect(user.email).toBe(email);
    expect(user.isActive).toBe(true);
    expect(user.isSuperAdmin).toBe(false);
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it('enforces unique email constraint on User', async () => {
    const email = uniqueEmail();

    const user1 = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Bob', lastName: 'Jones' },
    });
    createdUserIds.push(user1.id);

    await expect(
      prisma.user.create({
        data: { email, passwordHash: 'hash2', firstName: 'Bob2', lastName: 'Jones2' },
      })
    ).rejects.toThrow();
  });

  // -------------------------------------------------------------------------
  // Organization model
  // -------------------------------------------------------------------------

  it('creates an organization with required fields', async () => {
    const org = await prisma.organization.create({
      data: {
        name: 'Acme Developers Ltd',
        slug: uniqueSlug(),
        type: OrganizationType.DEVELOPER,
      },
    });

    createdOrgIds.push(org.id);

    expect(org.id).toBeTruthy();
    expect(org.isActive).toBe(true);
    expect(org.type).toBe(OrganizationType.DEVELOPER);
  });

  it('enforces unique slug constraint on Organization', async () => {
    const slug = uniqueSlug();

    const org1 = await prisma.organization.create({
      data: { name: 'Org One', slug, type: OrganizationType.CONTRACTOR },
    });
    createdOrgIds.push(org1.id);

    await expect(
      prisma.organization.create({
        data: { name: 'Org Two', slug, type: OrganizationType.CONTRACTOR },
      })
    ).rejects.toThrow();
  });

  // -------------------------------------------------------------------------
  // OrganizationMembership model
  // -------------------------------------------------------------------------

  it('links a user to an organization with a role', async () => {
    const user = await prisma.user.create({
      data: { email: uniqueEmail(), passwordHash: 'hash', firstName: 'Carol', lastName: 'Dev' },
    });
    createdUserIds.push(user.id);

    const org = await prisma.organization.create({
      data: { name: 'Carol Builds', slug: uniqueSlug(), type: OrganizationType.DEVELOPER },
    });
    createdOrgIds.push(org.id);

    const membership = await prisma.organizationMembership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: Role.DEVELOPER,
        status: MembershipStatus.ACTIVE,
        isDefault: true,
      },
    });

    expect(membership.userId).toBe(user.id);
    expect(membership.organizationId).toBe(org.id);
    expect(membership.role).toBe(Role.DEVELOPER);
    expect(membership.isDefault).toBe(true);
  });

  it('prevents duplicate membership for the same user+organization pair', async () => {
    const user = await prisma.user.create({
      data: { email: uniqueEmail(), passwordHash: 'hash', firstName: 'Dave', lastName: 'Dev' },
    });
    createdUserIds.push(user.id);

    const org = await prisma.organization.create({
      data: { name: 'Dave Corp', slug: uniqueSlug(), type: OrganizationType.DEVELOPER },
    });
    createdOrgIds.push(org.id);

    await prisma.organizationMembership.create({
      data: { userId: user.id, organizationId: org.id, role: Role.DEVELOPER },
    });

    await expect(
      prisma.organizationMembership.create({
        data: { userId: user.id, organizationId: org.id, role: Role.BUYER },
      })
    ).rejects.toThrow();
  });

  it('allows a user to belong to multiple different organizations', async () => {
    const user = await prisma.user.create({
      data: { email: uniqueEmail(), passwordHash: 'hash', firstName: 'Eve', lastName: 'Multi' },
    });
    createdUserIds.push(user.id);

    const org1 = await prisma.organization.create({
      data: { name: 'Org A', slug: uniqueSlug(), type: OrganizationType.DEVELOPER },
    });
    createdOrgIds.push(org1.id);

    const org2 = await prisma.organization.create({
      data: { name: 'Org B', slug: uniqueSlug(), type: OrganizationType.CONTRACTOR },
    });
    createdOrgIds.push(org2.id);

    const [m1, m2] = await Promise.all([
      prisma.organizationMembership.create({
        data: { userId: user.id, organizationId: org1.id, role: Role.DEVELOPER },
      }),
      prisma.organizationMembership.create({
        data: { userId: user.id, organizationId: org2.id, role: Role.CONTRACTOR },
      }),
    ]);

    expect(m1.organizationId).toBe(org1.id);
    expect(m2.organizationId).toBe(org2.id);
    expect(m1.role).toBe(Role.DEVELOPER);
    expect(m2.role).toBe(Role.CONTRACTOR);
  });

  it('cascades deletion of memberships when a user is deleted', async () => {
    const user = await prisma.user.create({
      data: { email: uniqueEmail(), passwordHash: 'hash', firstName: 'Frank', lastName: 'Gone' },
    });
    // Not pushed to createdUserIds — we delete it directly in this test

    const org = await prisma.organization.create({
      data: { name: 'Cascade Org', slug: uniqueSlug(), type: OrganizationType.DEVELOPER },
    });
    createdOrgIds.push(org.id);

    const membership = await prisma.organizationMembership.create({
      data: { userId: user.id, organizationId: org.id, role: Role.DEVELOPER },
    });

    // Delete the user — membership should cascade
    await prisma.user.delete({ where: { id: user.id } });

    const found = await prisma.organizationMembership.findUnique({
      where: { id: membership.id },
    });

    expect(found).toBeNull();
  });
});
