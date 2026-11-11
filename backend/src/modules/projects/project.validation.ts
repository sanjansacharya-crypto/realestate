import { z } from 'zod';
import { ProjectType, ProjectStatus, AreaUnit } from '@prisma/client';

// Valid project code: 2–30 chars, alphanumeric, hyphens and underscores allowed
const projectCodeRegex = /^[A-Z0-9][A-Z0-9_-]{1,29}$/i;

export const createProjectSchema = z
  .object({
    name: z
      .string({ required_error: 'Project name is required' })
      .trim()
      .min(3, 'Project name must be at least 3 characters')
      .max(120, 'Project name must not exceed 120 characters'),

    code: z
      .string({ required_error: 'Project code is required' })
      .trim()
      .min(2, 'Project code must be at least 2 characters')
      .max(30, 'Project code must not exceed 30 characters')
      .regex(
        projectCodeRegex,
        'Project code may only contain letters, numbers, hyphens and underscores'
      )
      .transform((v) => v.toUpperCase()),

    description: z
      .string()
      .trim()
      .max(2000, 'Description must not exceed 2,000 characters')
      .optional(),

    projectType: z
      .nativeEnum(ProjectType, { errorMap: () => ({ message: 'Invalid project type' }) })
      .default(ProjectType.PLOTTED_DEVELOPMENT),

    status: z
      .nativeEnum(ProjectStatus, { errorMap: () => ({ message: 'Invalid project status' }) })
      .default(ProjectStatus.PLANNING),

    reraNumber: z
      .string()
      .trim()
      .max(60, 'RERA number must not exceed 60 characters')
      .optional(),

    address: z.string().trim().max(255).optional(),

    city: z
      .string({ required_error: 'City is required' })
      .trim()
      .min(2, 'City must be at least 2 characters')
      .max(100, 'City must not exceed 100 characters'),

    state: z
      .string({ required_error: 'State is required' })
      .trim()
      .min(2, 'State must be at least 2 characters')
      .max(100, 'State must not exceed 100 characters'),

    postalCode: z.string().trim().max(20).optional(),

    country: z.string().trim().max(100).default('India'),

    latitude: z
      .number()
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90')
      .optional(),

    longitude: z
      .number()
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180')
      .optional(),

    totalArea: z
      .number()
      .positive('Total area must be a positive number')
      .optional(),

    areaUnit: z
      .nativeEnum(AreaUnit, { errorMap: () => ({ message: 'Invalid area unit' }) })
      .default(AreaUnit.ACRES),

    expectedStartDate: z
      .string()
      .datetime({ message: 'expectedStartDate must be a valid ISO 8601 date-time string' })
      .optional(),

    expectedCompletionDate: z
      .string()
      .datetime({ message: 'expectedCompletionDate must be a valid ISO 8601 date-time string' })
      .optional(),
  })
  .refine(
    (data) => {
      if (data.expectedStartDate && data.expectedCompletionDate) {
        return new Date(data.expectedCompletionDate) >= new Date(data.expectedStartDate);
      }
      return true;
    },
    {
      message: 'expectedCompletionDate must be on or after expectedStartDate',
      path: ['expectedCompletionDate'],
    }
  );

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(3).max(120).optional(),

    code: z
      .string()
      .trim()
      .min(2)
      .max(30)
      .regex(projectCodeRegex, 'Project code may only contain letters, numbers, hyphens and underscores')
      .transform((v) => v.toUpperCase())
      .optional(),

    description: z.string().trim().max(2000).nullable().optional(),

    projectType: z
      .nativeEnum(ProjectType, { errorMap: () => ({ message: 'Invalid project type' }) })
      .optional(),

    status: z
      .nativeEnum(ProjectStatus, { errorMap: () => ({ message: 'Invalid project status' }) })
      .optional(),

    reraNumber: z.string().trim().max(60).nullable().optional(),

    address: z.string().trim().max(255).nullable().optional(),
    city: z.string().trim().min(2).max(100).optional(),
    state: z.string().trim().min(2).max(100).optional(),
    postalCode: z.string().trim().max(20).nullable().optional(),
    country: z.string().trim().max(100).optional(),

    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),

    totalArea: z.number().positive().nullable().optional(),
    areaUnit: z.nativeEnum(AreaUnit).optional(),

    expectedStartDate: z.string().datetime().nullable().optional(),
    expectedCompletionDate: z.string().datetime().nullable().optional(),
    actualCompletionDate: z.string().datetime().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.expectedStartDate && data.expectedCompletionDate) {
        return new Date(data.expectedCompletionDate as string) >= new Date(data.expectedStartDate as string);
      }
      return true;
    },
    {
      message: 'expectedCompletionDate must be on or after expectedStartDate',
      path: ['expectedCompletionDate'],
    }
  );

export const projectListQuerySchema = z.object({
  status: z.nativeEnum(ProjectStatus).optional(),
  projectType: z.nativeEnum(ProjectType).optional(),
  search: z.string().trim().max(100).optional(),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? Math.max(1, parseInt(v, 10)) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => {
      const parsed = v ? parseInt(v, 10) : 20;
      return Math.min(Math.max(1, parsed), 100); // clamp 1–100
    }),
});
