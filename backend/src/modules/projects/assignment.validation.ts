import { z } from 'zod';
import { AssignmentType, AssignmentStatus, ProjectMemberRole } from '@prisma/client';

export const assignOrganizationSchema = z
  .object({
    organizationId: z.string().uuid('organizationId must be a valid UUID'),
    assignmentType: z.nativeEnum(AssignmentType, {
      errorMap: () => ({ message: 'assignmentType must be CONTRACTOR or VENDOR' }),
    }),
    scopeOfWork: z.string().trim().max(2000).optional(),
    startDate: z
      .string()
      .datetime({ message: 'startDate must be a valid ISO 8601 string' })
      .optional(),
    endDate: z
      .string()
      .datetime({ message: 'endDate must be a valid ISO 8601 string' })
      .optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'endDate must be on or after startDate',
      path: ['endDate'],
    }
  );

export const updateOrganizationAssignmentSchema = z
  .object({
    status: z.nativeEnum(AssignmentStatus, {
      errorMap: () => ({ message: 'Invalid assignment status' }),
    }).optional(),
    scopeOfWork: z.string().trim().max(2000).nullable().optional(),
    startDate: z
      .string()
      .datetime({ message: 'startDate must be a valid ISO 8601 string' })
      .nullable()
      .optional(),
    endDate: z
      .string()
      .datetime({ message: 'endDate must be a valid ISO 8601 string' })
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate as string) >= new Date(data.startDate as string);
      }
      return true;
    },
    {
      message: 'endDate must be on or after startDate',
      path: ['endDate'],
    }
  );

export const assignProjectMemberSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
  role: z.nativeEnum(ProjectMemberRole, {
    errorMap: () => ({ message: 'Invalid project member role' }),
  }),
  organizationId: z.string().uuid('organizationId must be a valid UUID').optional(),
});

export const updateProjectMemberSchema = z.object({
  role: z.nativeEnum(ProjectMemberRole).optional(),
  status: z.nativeEnum(AssignmentStatus).optional(),
});

