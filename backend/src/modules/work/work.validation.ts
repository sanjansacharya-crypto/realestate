import { z } from 'zod';
import { WorkPackageStatus } from '@prisma/client';

const dateString = z.string().datetime({ message: 'Must be a valid ISO 8601 date' });

export const createWorkPackageSchema = z.object({
  contractorOrgId: z.string().uuid(),
  category: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(5000).optional(),
  plannedWeight: z.number().positive().max(100000),
  deadline: dateString.optional(),
});

export const updateWorkPackageSchema = z.object({
  category: z.string().trim().min(1).max(80).optional(),
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  plannedWeight: z.number().positive().max(100000).optional(),
  status: z.nativeEnum(WorkPackageStatus).optional(),
  deadline: dateString.nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const submitProgressSchema = z.object({
  workDate: z.string().date(),
  progressDelta: z.number().positive().max(100),
  description: z.string().trim().min(1).max(5000),
  photoMetadata: z.array(z.object({
    fileName: z.string().trim().min(1).max(255),
    contentType: z.string().trim().min(1).max(100),
    storageKey: z.string().trim().min(1).max(500),
    capturedAt: dateString.optional(),
  }).strict()).max(10).optional(),
});

export const reviewProgressSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  reviewNote: z.string().trim().min(1).max(2000),
});

export const workListQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.nativeEnum(WorkPackageStatus).optional(),
  page: z.string().optional().transform((v) => v ? Math.max(1, parseInt(v, 10) || 1) : 1),
  limit: z.string().optional().transform((v) => Math.min(Math.max(1, parseInt(v || '20', 10) || 20), 100)),
});
