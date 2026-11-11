import { z } from 'zod';
import { BookingStatus, PaymentMethod } from '@prisma/client';

export const createBookingSchema = z.object({
  projectId: z.string().uuid('projectId must be a valid UUID'),
  plotId: z.string().uuid('plotId must be a valid UUID'),
  notes: z.string().trim().max(1000).optional(),
});

export const reviewBookingSchema = z
  .object({
    action: z.enum(['APPROVE', 'REJECT'], {
      required_error: "Action must be either 'APPROVE' or 'REJECT'",
    }),
    reservationExpiresAt: z
      .string()
      .datetime({ message: 'reservationExpiresAt must be a valid ISO 8601 date string' })
      .optional(),
    rejectionReason: z.string().trim().max(1000).optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine(
    (data) => {
      if (data.action === 'REJECT' && !data.rejectionReason) {
        return false;
      }
      return true;
    },
    {
      message: 'rejectionReason is required when rejecting a booking request',
      path: ['rejectionReason'],
    }
  );

export const recordPaymentSchema = z.object({
  amount: z
    .number({ required_error: 'Payment amount is required' })
    .positive('Payment amount must be greater than zero'),
  paymentMethod: z
    .nativeEnum(PaymentMethod, {
      errorMap: () => ({
        message: 'Invalid payment method. Must be BANK_TRANSFER, CHEQUE, DEMAND_DRAFT, UPI, or OTHER',
      }),
    })
    .default(PaymentMethod.BANK_TRANSFER),
  referenceNumber: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const verifyPaymentSchema = z.object({
  action: z.enum(['VERIFY', 'REJECT'], {
    required_error: "Action must be either 'VERIFY' or 'REJECT'",
  }),
  notes: z.string().trim().max(1000).optional(),
});

export const cancelBookingSchema = z.object({
  cancellationReason: z.string().trim().max(1000).optional(),
});

export const bookingListQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  plotId: z.string().uuid().optional(),
  buyerId: z.string().uuid().optional(),
  status: z.nativeEnum(BookingStatus).optional(),
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

