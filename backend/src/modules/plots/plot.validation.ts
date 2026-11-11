import { z } from 'zod';
import { PlotStatus, PlotFacing, PlotType, AreaUnit } from '@prisma/client';

export const createPlotSchema = z.object({
  plotNumber: z
    .string({ required_error: 'Plot number is required' })
    .trim()
    .min(1, 'Plot number must not be empty')
    .max(50, 'Plot number must not exceed 50 characters')
    .transform((v) => v.toUpperCase()),

  plotType: z
    .nativeEnum(PlotType, { errorMap: () => ({ message: 'Invalid plot type' }) })
    .default(PlotType.RESIDENTIAL),

  status: z
    .nativeEnum(PlotStatus, { errorMap: () => ({ message: 'Invalid plot status' }) })
    .default(PlotStatus.AVAILABLE),

  area: z
    .number({ required_error: 'Plot area is required' })
    .positive('Plot area must be a positive number'),

  areaUnit: z
    .nativeEnum(AreaUnit, { errorMap: () => ({ message: 'Invalid area unit' }) })
    .default(AreaUnit.SQ_FT),

  length: z.number().positive('Length must be positive').optional(),
  width: z.number().positive('Width must be positive').optional(),

  facing: z
    .nativeEnum(PlotFacing, { errorMap: () => ({ message: 'Invalid facing direction' }) })
    .optional(),

  block: z.string().trim().max(50).optional(),
  sector: z.string().trim().max(50).optional(),
  layoutReference: z.string().trim().max(100).optional(),

  basePricePerUnit: z.number().positive('Base price per unit must be positive').optional(),

  totalPrice: z
    .number({ required_error: 'Total price is required' })
    .positive('Total price must be a positive number'),

  currency: z.string().trim().max(10).default('INR'),

  isCornerPlot: z.boolean().default(false),
  isParkFacing: z.boolean().default(false),
  premiumCharges: z.number().nonnegative('Premium charges cannot be negative').default(0),

  description: z.string().trim().max(2000).optional(),
});

export const updatePlotSchema = z.object({
  plotNumber: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .transform((v) => v.toUpperCase())
    .optional(),

  plotType: z.nativeEnum(PlotType).optional(),
  status: z.nativeEnum(PlotStatus).optional(),

  area: z.number().positive().optional(),
  areaUnit: z.nativeEnum(AreaUnit).optional(),

  length: z.number().positive().nullable().optional(),
  width: z.number().positive().nullable().optional(),

  facing: z.nativeEnum(PlotFacing).nullable().optional(),

  block: z.string().trim().max(50).nullable().optional(),
  sector: z.string().trim().max(50).nullable().optional(),
  layoutReference: z.string().trim().max(100).nullable().optional(),

  basePricePerUnit: z.number().positive().nullable().optional(),
  totalPrice: z.number().positive().optional(),
  currency: z.string().trim().max(10).optional(),

  isCornerPlot: z.boolean().optional(),
  isParkFacing: z.boolean().optional(),
  premiumCharges: z.number().nonnegative().optional(),

  description: z.string().trim().max(2000).nullable().optional(),
});

export const plotFilterQuerySchema = z.object({
  status: z.nativeEnum(PlotStatus).optional(),
  plotType: z.nativeEnum(PlotType).optional(),
  facing: z.nativeEnum(PlotFacing).optional(),
  block: z.string().trim().optional(),
  sector: z.string().trim().optional(),
  minPrice: z
    .string()
    .optional()
    .transform((v) => (v ? parseFloat(v) : undefined)),
  maxPrice: z
    .string()
    .optional()
    .transform((v) => (v ? parseFloat(v) : undefined)),
  minArea: z
    .string()
    .optional()
    .transform((v) => (v ? parseFloat(v) : undefined)),
  maxArea: z
    .string()
    .optional()
    .transform((v) => (v ? parseFloat(v) : undefined)),
  isCornerPlot: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  isParkFacing: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
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
      return Math.min(Math.max(1, parsed), 100);
    }),
});

