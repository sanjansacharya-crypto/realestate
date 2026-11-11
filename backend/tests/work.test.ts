import { describe, expect, it } from 'vitest';
import { createWorkPackageSchema, reviewProgressSchema, submitProgressSchema, updateWorkPackageSchema } from '../src/modules/work/work.validation';

describe('Phase 10: Contractor Work and Construction Progress', () => {
  it('accepts a valid work package with a configurable category and positive weight', () => {
    expect(createWorkPackageSchema.safeParse({
      contractorOrgId: '11111111-1111-4111-8111-111111111111', category: 'Civil works', title: 'Internal roads', plannedWeight: 25,
    }).success).toBe(true);
  });

  it('rejects non-positive planned weights', () => {
    expect(createWorkPackageSchema.safeParse({ contractorOrgId: '11111111-1111-4111-8111-111111111111', category: 'Civil', title: 'Roads', plannedWeight: 0 }).success).toBe(false);
  });

  it('accepts an incremental daily progress update and photo metadata', () => {
    expect(submitProgressSchema.safeParse({
      workDate: '2026-11-09', progressDelta: 12.5, description: 'Completed base layer on the east access road.',
      photoMetadata: [{ fileName: 'road.jpg', contentType: 'image/jpeg', storageKey: 'evidence/road.jpg' }],
    }).success).toBe(true);
  });

  it('rejects progress outside the valid delta range and arbitrary photo fields', () => {
    const common = { workDate: '2026-11-09', description: 'Work completed.' };
    expect(submitProgressSchema.safeParse({ ...common, progressDelta: 0 }).success).toBe(false);
    expect(submitProgressSchema.safeParse({ ...common, progressDelta: 101 }).success).toBe(false);
    expect(submitProgressSchema.safeParse({ ...common, progressDelta: 5, photoMetadata: [{ fileName: 'x', contentType: 'image/jpeg', storageKey: 'x', url: 'https://example.com' }] }).success).toBe(false);
  });

  it('requires a reason for every progress review decision', () => {
    expect(reviewProgressSchema.safeParse({ action: 'APPROVE', reviewNote: 'Verified onsite.' }).success).toBe(true);
    expect(reviewProgressSchema.safeParse({ action: 'REJECT', reviewNote: '' }).success).toBe(false);
  });

  it('requires at least one valid work-package update field', () => {
    expect(updateWorkPackageSchema.safeParse({}).success).toBe(false);
    expect(updateWorkPackageSchema.safeParse({ status: 'COMPLETED' }).success).toBe(true);
  });
});
