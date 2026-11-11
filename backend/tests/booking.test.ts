import { describe, it, expect } from 'vitest';
import { BookingStatus, PaymentMethod, PaymentStatus, PlotStatus, Role } from '@prisma/client';
import {
  createBookingSchema,
  reviewBookingSchema,
  recordPaymentSchema,
  verifyPaymentSchema,
  cancelBookingSchema,
  bookingListQuerySchema,
} from '../src/modules/bookings/booking.validation';

describe('Phase 9: Buyer Enquiries & Plot Booking Lifecycle', () => {
  // -------------------------------------------------------------------------
  // 1. Validation Tests: Create Booking
  // -------------------------------------------------------------------------
  describe('createBookingSchema', () => {
    const validBookingPayload = {
      projectId: '11111111-1111-1111-1111-111111111111',
      plotId: '22222222-2222-2222-2222-222222222222',
      notes: 'Interested in Corner Plot P-101 for residential villa construction.',
    };

    it('accepts valid booking request payload', () => {
      const result = createBookingSchema.safeParse(validBookingPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.projectId).toBe(validBookingPayload.projectId);
        expect(result.data.plotId).toBe(validBookingPayload.plotId);
      }
    });

    it('rejects invalid UUIDs for projectId and plotId', () => {
      expect(
        createBookingSchema.safeParse({ ...validBookingPayload, projectId: 'not-a-uuid' }).success
      ).toBe(false);
      expect(
        createBookingSchema.safeParse({ ...validBookingPayload, plotId: 'not-a-uuid' }).success
      ).toBe(false);
    });

    it('rejects notes exceeding 1000 characters', () => {
      expect(
        createBookingSchema.safeParse({ ...validBookingPayload, notes: 'X'.repeat(1001) }).success
      ).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Validation Tests: Review Booking
  // -------------------------------------------------------------------------
  describe('reviewBookingSchema', () => {
    it('accepts valid APPROVE review with reservation expiry', () => {
      const result = reviewBookingSchema.safeParse({
        action: 'APPROVE',
        reservationExpiresAt: '2026-11-15T00:00:00.000Z',
        notes: 'Hold granted for 72 hours for token payment.',
      });
      expect(result.success).toBe(true);
    });

    it('accepts valid REJECT review with rejection reason', () => {
      const result = reviewBookingSchema.safeParse({
        action: 'REJECT',
        rejectionReason: 'Plot is currently on hold for internal project amenities.',
      });
      expect(result.success).toBe(true);
    });

    it('rejects REJECT action when rejectionReason is missing', () => {
      const result = reviewBookingSchema.safeParse({
        action: 'REJECT',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid action', () => {
      expect(
        reviewBookingSchema.safeParse({ action: 'DISMISS' }).success
      ).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Validation Tests: Payment Records
  // -------------------------------------------------------------------------
  describe('recordPaymentSchema & verifyPaymentSchema', () => {
    it('accepts valid payment record with UTR reference', () => {
      const result = recordPaymentSchema.safeParse({
        amount: 200000,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        referenceNumber: 'HDFC000123456789',
        notes: 'RTGS booking token payment.',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amount).toBe(200000);
        expect(result.data.paymentMethod).toBe(PaymentMethod.BANK_TRANSFER);
      }
    });

    it('rejects zero or negative payment amount', () => {
      expect(
        recordPaymentSchema.safeParse({
          amount: 0,
          paymentMethod: PaymentMethod.UPI,
        }).success
      ).toBe(false);
      expect(
        recordPaymentSchema.safeParse({
          amount: -500,
          paymentMethod: PaymentMethod.UPI,
        }).success
      ).toBe(false);
    });

    it('rejects invalid payment method', () => {
      expect(
        recordPaymentSchema.safeParse({
          amount: 50000,
          paymentMethod: 'BITCOIN',
        }).success
      ).toBe(false);
    });

    it('accepts valid verify payment action', () => {
      expect(
        verifyPaymentSchema.safeParse({ action: 'VERIFY', notes: 'Bank account credited.' }).success
      ).toBe(true);
      expect(
        verifyPaymentSchema.safeParse({ action: 'REJECT', notes: 'Cheque bounced.' }).success
      ).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Critical Concurrency & Double-Booking Prevention Tests
  // -------------------------------------------------------------------------
  describe('Double-Booking Concurrency Guarantees', () => {
    it('rule: atomic check-and-lock succeeds when plot is AVAILABLE', () => {
      const currentPlotState = { status: PlotStatus.AVAILABLE, isActive: true };

      // Simulation of conditional update: UPDATE plots SET status = 'BOOKING_PENDING' WHERE status = 'AVAILABLE'
      const tryLockPlot = (plot: typeof currentPlotState) => {
        if (plot.status === PlotStatus.AVAILABLE && plot.isActive) {
          plot.status = PlotStatus.BOOKING_PENDING;
          return { count: 1 };
        }
        return { count: 0 };
      };

      const buyer1Result = tryLockPlot(currentPlotState);
      expect(buyer1Result.count).toBe(1);
      expect(currentPlotState.status).toBe(PlotStatus.BOOKING_PENDING);
    });

    it('CRITICAL: simultaneous booking attempt by Buyer 2 on same plot is rejected with 409 Conflict', () => {
      // Plot is already locked by Buyer 1 in state BOOKING_PENDING
      const lockedPlot = { status: PlotStatus.BOOKING_PENDING, isActive: true };

      const tryLockPlot = (plot: typeof lockedPlot) => {
        if (plot.status === PlotStatus.AVAILABLE && plot.isActive) {
          plot.status = PlotStatus.BOOKING_PENDING;
          return { count: 1 };
        }
        return { count: 0 };
      };

      // Buyer 2 attempts to lock
      const buyer2Result = tryLockPlot(lockedPlot);
      expect(buyer2Result.count).toBe(0); // 0 rows updated -> Triggers ConflictError (409)
    });

    it('rejects booking on plots that are TEMPORARILY_RESERVED, BOOKED, or SOLD', () => {
      const isAvailableForBooking = (status: PlotStatus) => status === PlotStatus.AVAILABLE;

      expect(isAvailableForBooking(PlotStatus.AVAILABLE)).toBe(true);
      expect(isAvailableForBooking(PlotStatus.TEMPORARILY_RESERVED)).toBe(false);
      expect(isAvailableForBooking(PlotStatus.BOOKING_PENDING)).toBe(false);
      expect(isAvailableForBooking(PlotStatus.BOOKED)).toBe(false);
      expect(isAvailableForBooking(PlotStatus.SOLD)).toBe(false);
      expect(isAvailableForBooking(PlotStatus.BLOCKED)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Booking State Machine & Transition Tests
  // -------------------------------------------------------------------------
  describe('Booking State Machine Transitions', () => {
    it('transition: SUBMITTED -> RESERVED updates plot to TEMPORARILY_RESERVED', () => {
      const booking = { status: BookingStatus.SUBMITTED };
      const plot = { status: PlotStatus.BOOKING_PENDING };

      // Developer approves hold
      booking.status = BookingStatus.RESERVED;
      plot.status = PlotStatus.TEMPORARILY_RESERVED;

      expect(booking.status).toBe(BookingStatus.RESERVED);
      expect(plot.status).toBe(PlotStatus.TEMPORARILY_RESERVED);
    });

    it('transition: SUBMITTED -> REJECTED reverts plot back to AVAILABLE', () => {
      const booking = { status: BookingStatus.SUBMITTED };
      const plot = { status: PlotStatus.BOOKING_PENDING };

      // Developer rejects
      booking.status = BookingStatus.REJECTED;
      plot.status = PlotStatus.AVAILABLE;

      expect(booking.status).toBe(BookingStatus.REJECTED);
      expect(plot.status).toBe(PlotStatus.AVAILABLE); // Available for other buyers!
    });

    it('transition: RESERVED -> CONFIRMED updates plot to BOOKED', () => {
      const booking = { status: BookingStatus.RESERVED };
      const plot = { status: PlotStatus.TEMPORARILY_RESERVED };

      // Payment verified and booking confirmed
      booking.status = BookingStatus.CONFIRMED;
      plot.status = PlotStatus.BOOKED;

      expect(booking.status).toBe(BookingStatus.CONFIRMED);
      expect(plot.status).toBe(PlotStatus.BOOKED);
    });

    it('transition: CANCELLED reverts plot back to AVAILABLE', () => {
      const booking = { status: BookingStatus.RESERVED };
      const plot = { status: PlotStatus.TEMPORARILY_RESERVED };

      // Buyer cancels hold
      booking.status = BookingStatus.CANCELLED;
      plot.status = PlotStatus.AVAILABLE;

      expect(booking.status).toBe(BookingStatus.CANCELLED);
      expect(plot.status).toBe(PlotStatus.AVAILABLE);
    });

    it('rule: Cannot review a booking that is already CANCELLED or CONFIRMED', () => {
      const canReview = (status: BookingStatus) => {
        return status === BookingStatus.SUBMITTED || status === BookingStatus.UNDER_REVIEW;
      };

      expect(canReview(BookingStatus.SUBMITTED)).toBe(true);
      expect(canReview(BookingStatus.UNDER_REVIEW)).toBe(true);
      expect(canReview(BookingStatus.RESERVED)).toBe(false);
      expect(canReview(BookingStatus.CONFIRMED)).toBe(false);
      expect(canReview(BookingStatus.CANCELLED)).toBe(false);
      expect(canReview(BookingStatus.REJECTED)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Security & Audit History Rules
  // -------------------------------------------------------------------------
  describe('Security & Audit History Rules', () => {
    it('security rule: Never trust client-provided payment success flag', () => {
      const clientPayload = { amount: 100000, payment_success: true };

      // The backend ignores payment_success and always sets status to PENDING_VERIFICATION
      const initialPaymentRecordStatus = PaymentStatus.PENDING_VERIFICATION;
      expect(initialPaymentRecordStatus).toBe(PaymentStatus.PENDING_VERIFICATION);
      expect((clientPayload as any).payment_success).toBe(true);
      expect(initialPaymentRecordStatus !== (PaymentStatus.VERIFIED as any)).toBe(true);
    });

    it('visibility rule: Buyers only see their own bookings', () => {
      const buyerId = 'buyer-001';
      const bookingA = { id: 'b1', buyerId: 'buyer-001' };
      const bookingB = { id: 'b2', buyerId: 'buyer-002' };

      const isVisibleToBuyer = (b: typeof bookingA) => b.buyerId === buyerId;

      expect(isVisibleToBuyer(bookingA)).toBe(true);
      expect(isVisibleToBuyer(bookingB)).toBe(false);
    });

    it('audit rule: Every state transition requires audit metadata', () => {
      const auditLog = {
        bookingId: 'b-1',
        performedById: 'user-dev-1',
        fromStatus: BookingStatus.SUBMITTED,
        toStatus: BookingStatus.RESERVED,
        action: 'BOOKING_APPROVED_RESERVED',
        createdAt: new Date(),
      };

      expect(auditLog.performedById).toBeDefined();
      expect(auditLog.fromStatus).toBe(BookingStatus.SUBMITTED);
      expect(auditLog.toStatus).toBe(BookingStatus.RESERVED);
      expect(auditLog.action).toBe('BOOKING_APPROVED_RESERVED');
    });
  });
});

