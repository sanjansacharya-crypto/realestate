import { z } from 'zod';

export const createModificationSchema = z.object({
  bookingId: z.string().uuid(),
  description: z.string().trim().min(10).max(5000),
});
export const reviewModificationSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  reviewNote: z.string().trim().min(1).max(2000),
  estimatedCost: z.number().nonnegative().max(999999999999).optional(),
  deadline: z.string().datetime().optional(),
}).refine((v) => v.action !== 'REJECT' || v.estimatedCost === undefined, 'Rejected requests cannot include an estimate');
export const assignModificationSchema = z.object({
  contractorOrgId: z.string().uuid(),
  deadline: z.string().datetime().optional(),
  estimatedCost: z.number().nonnegative().max(999999999999).optional(),
});
export const transitionModificationSchema = z.object({ note: z.string().trim().min(1).max(2000).optional() });
export const completeModificationSchema = z.object({
  note: z.string().trim().min(1).max(2000),
  evidence: z.array(z.object({ fileName: z.string().min(1).max(255), contentType: z.string().min(1).max(100), storageKey: z.string().min(1).max(500) }).strict()).max(10).min(1),
});
