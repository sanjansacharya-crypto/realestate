import { describe, expect, it } from 'vitest';
import { ModificationRequestStatus } from '@prisma/client';
import { assignModificationSchema, completeModificationSchema, createModificationSchema, reviewModificationSchema } from '../src/modules/modifications/modification.validation';

describe('Phase 11 buyer modification requests', () => {
  it('requires a booking and meaningful description', () => {
    expect(createModificationSchema.safeParse({ bookingId: '11111111-1111-4111-8111-111111111111', description: 'Add electrical outlets.' }).success).toBe(true);
    expect(createModificationSchema.safeParse({ bookingId: 'bad', description: 'Short' }).success).toBe(false);
  });
  it('allows valid approval and rejection review payloads', () => {
    expect(reviewModificationSchema.safeParse({ action: 'APPROVE', reviewNote: 'Approved', estimatedCost: 2500 }).success).toBe(true);
    expect(reviewModificationSchema.safeParse({ action: 'REJECT', reviewNote: 'Out of scope' }).success).toBe(true);
    expect(reviewModificationSchema.safeParse({ action: 'APPROVE', reviewNote: '', estimatedCost: -1 }).success).toBe(false);
  });
  it('requires a contractor organization for assignment', () => {
    expect(assignModificationSchema.safeParse({ contractorOrgId: '22222222-2222-4222-8222-222222222222' }).success).toBe(true);
    expect(assignModificationSchema.safeParse({ contractorOrgId: 'bad' }).success).toBe(false);
  });
  it('requires evidence to complete and rejects untrusted extra metadata', () => {
    const payload = { note: 'Completed as approved.', evidence: [{ fileName: 'after.jpg', contentType: 'image/jpeg', storageKey: 'modifications/after.jpg' }] };
    expect(completeModificationSchema.safeParse(payload).success).toBe(true);
    expect(completeModificationSchema.safeParse({ note: 'done', evidence: [] }).success).toBe(false);
    expect(completeModificationSchema.safeParse({ ...payload, evidence: [{ ...payload.evidence[0], url: 'https://bad.invalid' }] }).success).toBe(false);
  });
  it('defines all lifecycle states without permitting client-selected states', () => {
    expect(Object.values(ModificationRequestStatus)).toEqual(['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
  });
});
