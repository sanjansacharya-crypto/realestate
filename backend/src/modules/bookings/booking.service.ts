import {
  Booking,
  BookingStatus,
  PaymentRecord,
  PaymentStatus,
  PlotStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { prisma } from '../../config/db';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ValidationError,
} from '../../common/errors/appError';
import {
  CreateBookingDTO,
  ReviewBookingDTO,
  RecordPaymentDTO,
  VerifyPaymentDTO,
  CancelBookingDTO,
  BookingListQuery,
} from './booking.types';

class BookingService {
  /**
   * Helper: Generate human-readable unique identifier.
   */
  private generateReference(prefix: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Step 1: Buyer submits a booking request for an available plot.
   *
   * CRITICAL CONCURRENCY CONTROL:
   * Uses an atomic database conditional update within an interactive transaction
   * to guarantee that two buyers simultaneously attempting to book the same plot
   * can NEVER double-book. Exactly one transaction succeeds in updating the plot
   * from AVAILABLE -> BOOKING_PENDING; all concurrent requests fail with 409 Conflict.
   */
  public async createBookingRequest(
    buyerUserId: string,
    dto: CreateBookingDTO
  ): Promise<Booking> {
    return prisma.$transaction(async (tx) => {
      // 1. Verify project exists and is active
      const project = await tx.project.findUnique({
        where: { id: dto.projectId },
      });

      if (!project || !project.isActive) {
        throw new NotFoundError('Project not found or is currently inactive.');
      }

      // 2. ATOMIC LOCK & STATUS TRANSITION:
      // Conditional update ensures only one buyer can claim the plot row.
      const lockResult = await tx.plot.updateMany({
        where: {
          id: dto.plotId,
          projectId: dto.projectId,
          status: PlotStatus.AVAILABLE,
          isActive: true,
        },
        data: {
          status: PlotStatus.BOOKING_PENDING,
        },
      });

      if (lockResult.count === 0) {
        throw new ConflictError(
          'This plot is no longer available. It may have already been reserved or booked by another buyer.'
        );
      }

      // Retrieve plot details for price & currency snapshot
      const plot = await tx.plot.findUniqueOrThrow({
        where: { id: dto.plotId },
      });

      // 3. Create the booking entity
      const bookingNumber = this.generateReference('BKG');
      const booking = await tx.booking.create({
        data: {
          bookingNumber,
          projectId: dto.projectId,
          plotId: dto.plotId,
          buyerId: buyerUserId,
          organizationId: project.organizationId,
          status: BookingStatus.SUBMITTED,
          totalAgreedPrice: plot.totalPrice,
          currency: plot.currency,
          notes: dto.notes || null,
        },
        include: {
          plot: {
            select: { id: true, plotNumber: true, status: true, totalPrice: true, area: true },
          },
          project: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      // 4. Create immutable audit log
      await tx.bookingAuditLog.create({
        data: {
          bookingId: booking.id,
          performedById: buyerUserId,
          toStatus: BookingStatus.SUBMITTED,
          action: 'BOOKING_SUBMITTED',
          notes: 'Buyer submitted booking request.',
        },
      });

      return booking;
    });
  }

  /**
   * Step 2: Developer reviews/approves or rejects the booking request.
   */
  public async reviewBooking(
    bookingId: string,
    reviewerUserId: string,
    reviewerOrgId: string,
    dto: ReviewBookingDTO,
    isSuperAdmin = false
  ): Promise<Booking> {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { plot: true, project: true },
      });

      if (!booking) {
        throw new NotFoundError('Booking record not found.');
      }

      if (!isSuperAdmin && booking.organizationId !== reviewerOrgId) {
        throw new ForbiddenError('Access denied: You do not have permission to review bookings for this project.');
      }

      // Verify valid state transition
      if (
        booking.status !== BookingStatus.SUBMITTED &&
        booking.status !== BookingStatus.UNDER_REVIEW
      ) {
        throw new ConflictError(
          `Cannot review booking in status '${booking.status}'. Only SUBMITTED or UNDER_REVIEW bookings can be reviewed.`
        );
      }

      if (dto.action === 'APPROVE') {
        const expiresAt = dto.reservationExpiresAt
          ? new Date(dto.reservationExpiresAt)
          : new Date(Date.now() + 72 * 60 * 60 * 1000); // Default 72 hours hold

        const updatedBooking = await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: BookingStatus.RESERVED,
            reservationExpiresAt: expiresAt,
            reviewedById: reviewerUserId,
            reviewedAt: new Date(),
            notes: dto.notes || booking.notes,
          },
        });

        // Update plot status to TEMPORARILY_RESERVED
        await tx.plot.update({
          where: { id: booking.plotId },
          data: { status: PlotStatus.TEMPORARILY_RESERVED },
        });

        await tx.bookingAuditLog.create({
          data: {
            bookingId,
            performedById: reviewerUserId,
            fromStatus: booking.status,
            toStatus: BookingStatus.RESERVED,
            action: 'BOOKING_APPROVED_RESERVED',
            notes: `Temporary reservation approved until ${expiresAt.toISOString()}.`,
          },
        });

        return updatedBooking;
      } else {
        // REJECT: Revert plot back to AVAILABLE
        const updatedBooking = await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: BookingStatus.REJECTED,
            rejectionReason: dto.rejectionReason,
            reviewedById: reviewerUserId,
            reviewedAt: new Date(),
            notes: dto.notes || booking.notes,
          },
        });

        await tx.plot.update({
          where: { id: booking.plotId },
          data: { status: PlotStatus.AVAILABLE },
        });

        await tx.bookingAuditLog.create({
          data: {
            bookingId,
            performedById: reviewerUserId,
            fromStatus: booking.status,
            toStatus: BookingStatus.REJECTED,
            action: 'BOOKING_REJECTED',
            notes: `Rejection reason: ${dto.rejectionReason}`,
          },
        });

        return updatedBooking;
      }
    });
  }

  /**
   * Step 3: Record a payment transaction against the booking.
   * Records reference (e.g. bank transfer UTR or cheque). Does NOT accept fake success flags.
   */
  public async recordPayment(
    bookingId: string,
    recorderUserId: string,
    dto: RecordPaymentDTO
  ): Promise<PaymentRecord> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundError('Booking record not found.');
    }

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.REJECTED
    ) {
      throw new ConflictError(`Cannot record payments for a ${booking.status} booking.`);
    }

    const paymentNumber = this.generateReference('PAY');

    const payment = await prisma.paymentRecord.create({
      data: {
        paymentNumber,
        bookingId,
        amount: new Prisma.Decimal(dto.amount),
        currency: booking.currency,
        paymentMethod: dto.paymentMethod,
        referenceNumber: dto.referenceNumber || null,
        status: PaymentStatus.PENDING_VERIFICATION,
        notes: dto.notes || null,
        recordedById: recorderUserId,
      },
      include: {
        recordedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    await prisma.bookingAuditLog.create({
      data: {
        bookingId,
        performedById: recorderUserId,
        toStatus: booking.status,
        action: 'PAYMENT_RECORDED',
        notes: `Recorded payment ${paymentNumber} of ${booking.currency} ${dto.amount} (${dto.paymentMethod}). Pending developer verification.`,
      },
    });

    return payment;
  }

  /**
   * Step 4: Developer verifies or rejects recorded payment.
   */
  public async verifyPayment(
    bookingId: string,
    paymentId: string,
    verifierUserId: string,
    verifierOrgId: string,
    dto: VerifyPaymentDTO,
    isSuperAdmin = false
  ): Promise<PaymentRecord> {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new NotFoundError('Booking record not found.');
      }

      if (!isSuperAdmin && booking.organizationId !== verifierOrgId) {
        throw new ForbiddenError('Access denied: You do not manage this project.');
      }

      const payment = await tx.paymentRecord.findFirst({
        where: { id: paymentId, bookingId },
      });

      if (!payment) {
        throw new NotFoundError('Payment record not found.');
      }

      if (payment.status !== PaymentStatus.PENDING_VERIFICATION) {
        throw new ConflictError(`Payment has already been ${payment.status.toLowerCase()}.`);
      }

      if (dto.action === 'VERIFY') {
        const verifiedPayment = await tx.paymentRecord.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.VERIFIED,
            verifiedById: verifierUserId,
            verifiedAt: new Date(),
            notes: dto.notes ? `${payment.notes || ''} | Verification: ${dto.notes}` : payment.notes,
          },
        });

        // Update booking verified amount
        const updatedBookingAmount = Prisma.Decimal.add(booking.bookingAmount, payment.amount);
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            bookingAmount: updatedBookingAmount,
            // If in RESERVED, transition to PAYMENT_PENDING/ready for confirmation
            status:
              booking.status === BookingStatus.RESERVED || booking.status === BookingStatus.SUBMITTED
                ? BookingStatus.PAYMENT_PENDING
                : booking.status,
          },
        });

        await tx.bookingAuditLog.create({
          data: {
            bookingId,
            performedById: verifierUserId,
            toStatus: booking.status,
            action: 'PAYMENT_VERIFIED',
            notes: `Verified payment ${payment.paymentNumber} of ${payment.currency} ${payment.amount}.`,
          },
        });

        return verifiedPayment;
      } else {
        const rejectedPayment = await tx.paymentRecord.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.REJECTED,
            verifiedById: verifierUserId,
            verifiedAt: new Date(),
            notes: dto.notes ? `Rejection reason: ${dto.notes}` : payment.notes,
          },
        });

        await tx.bookingAuditLog.create({
          data: {
            bookingId,
            performedById: verifierUserId,
            toStatus: booking.status,
            action: 'PAYMENT_REJECTED',
            notes: `Payment ${payment.paymentNumber} rejected by developer.`,
          },
        });

        return rejectedPayment;
      }
    });
  }

  /**
   * Step 5: Developer confirms the booking.
   * Transitions booking to CONFIRMED, and plot to BOOKED.
   */
  public async confirmBooking(
    bookingId: string,
    confirmerUserId: string,
    confirmerOrgId: string,
    isSuperAdmin = false
  ): Promise<Booking> {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { plot: true },
      });

      if (!booking) {
        throw new NotFoundError('Booking record not found.');
      }

      if (!isSuperAdmin && booking.organizationId !== confirmerOrgId) {
        throw new ForbiddenError('Access denied: You do not manage this project.');
      }

      if (
        booking.status !== BookingStatus.RESERVED &&
        booking.status !== BookingStatus.PAYMENT_PENDING &&
        booking.status !== BookingStatus.SUBMITTED
      ) {
        throw new ConflictError(
          `Cannot confirm booking in status '${booking.status}'.`
        );
      }

      const confirmedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
      });

      // Update plot status to BOOKED
      await tx.plot.update({
        where: { id: booking.plotId },
        data: { status: PlotStatus.BOOKED },
      });

      // Ensure buyer is linked as project member with BUYER role
      await tx.projectMember.upsert({
        where: {
          projectId_userId: {
            projectId: booking.projectId,
            userId: booking.buyerId,
          },
        },
        update: {},
        create: {
          projectId: booking.projectId,
          userId: booking.buyerId,
          organizationId: booking.organizationId,
          assignedById: confirmerUserId,
          role: 'BUYER',
          status: 'ACTIVE',
        },
      });

      await tx.bookingAuditLog.create({
        data: {
          bookingId,
          performedById: confirmerUserId,
          fromStatus: booking.status,
          toStatus: BookingStatus.CONFIRMED,
          action: 'BOOKING_CONFIRMED',
          notes: 'Booking officially confirmed by developer. Plot locked.',
        },
      });

      return confirmedBooking;
    });
  }

  /**
   * Cancellation: Buyer or Developer cancels booking. Plot reverts to AVAILABLE.
   */
  public async cancelBooking(
    bookingId: string,
    cancellerUserId: string,
    cancellerOrgId: string,
    callerRole: Role,
    dto: CancelBookingDTO,
    isSuperAdmin = false
  ): Promise<Booking> {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new NotFoundError('Booking record not found.');
      }

      // Permission check: Buyer can only cancel their own booking; Developer can cancel bookings in their org
      if (callerRole === Role.BUYER && booking.buyerId !== cancellerUserId) {
        throw new ForbiddenError('You can only cancel your own bookings.');
      }
      if (
        callerRole === Role.DEVELOPER &&
        !isSuperAdmin &&
        booking.organizationId !== cancellerOrgId
      ) {
        throw new ForbiddenError('You do not manage this project.');
      }

      if (
        booking.status === BookingStatus.CANCELLED ||
        booking.status === BookingStatus.REJECTED ||
        booking.status === BookingStatus.COMPLETED
      ) {
        throw new ConflictError(`Cannot cancel a booking in status '${booking.status}'.`);
      }

      const cancelledBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          cancellationReason: dto.cancellationReason || null,
          cancelledAt: new Date(),
        },
      });

      // Revert plot back to AVAILABLE
      await tx.plot.update({
        where: { id: booking.plotId },
        data: { status: PlotStatus.AVAILABLE },
      });

      await tx.bookingAuditLog.create({
        data: {
          bookingId,
          performedById: cancellerUserId,
          fromStatus: booking.status,
          toStatus: BookingStatus.CANCELLED,
          action: 'BOOKING_CANCELLED',
          notes: dto.cancellationReason ? `Reason: ${dto.cancellationReason}` : 'Booking cancelled.',
        },
      });

      return cancelledBooking;
    });
  }

  /**
   * List bookings: Scoped by tenant and role.
   * Buyers only see their own bookings; Developers see all bookings in their organization's projects.
   */
  public async listBookings(
    callerUserId: string,
    callerOrgId: string,
    callerRole: Role,
    query: BookingListQuery,
    isSuperAdmin = false
  ): Promise<{ bookings: Booking[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.plotId ? { plotId: query.plotId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    if (callerRole === Role.BUYER && !isSuperAdmin) {
      where.buyerId = callerUserId;
    } else if (callerRole === Role.DEVELOPER && !isSuperAdmin) {
      where.organizationId = callerOrgId;
      if (query.buyerId) where.buyerId = query.buyerId;
    }

    const [bookings, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        include: {
          plot: {
            select: { id: true, plotNumber: true, status: true, totalPrice: true, area: true },
          },
          project: {
            select: { id: true, name: true, code: true },
          },
          buyer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return { bookings, total, page, limit };
  }

  /**
   * Get single booking with payment ledger and complete audit history.
   */
  public async getBookingById(
    bookingId: string,
    callerUserId: string,
    callerOrgId: string,
    callerRole: Role,
    isSuperAdmin = false
  ): Promise<Booking> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        plot: true,
        project: {
          select: { id: true, name: true, code: true },
        },
        buyer: {
          select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true },
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        paymentRecords: {
          orderBy: { createdAt: 'desc' },
          include: {
            recordedBy: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
            verifiedBy: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        auditLogs: {
          orderBy: { createdAt: 'asc' },
          include: {
            performedBy: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError('Booking record not found.');
    }

    if (callerRole === Role.BUYER && !isSuperAdmin && booking.buyerId !== callerUserId) {
      throw new NotFoundError('Booking record not found.');
    }

    if (
      callerRole === Role.DEVELOPER &&
      !isSuperAdmin &&
      booking.organizationId !== callerOrgId
    ) {
      throw new NotFoundError('Booking record not found.');
    }

    return booking;
  }
}

export const bookingService = new BookingService();

