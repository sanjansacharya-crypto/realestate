import { Request, Response, NextFunction } from 'express';
import { bookingService } from './booking.service';
import { bookingListQuerySchema } from './booking.validation';
import { ValidationError } from '../../common/errors/appError';

class BookingController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const buyerUserId = req.user!.id;
      const booking = await bookingService.createBookingRequest(buyerUserId, req.body);
      res.status(201).json({ success: true, data: booking });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const callerUserId = req.user!.id;
      const callerOrgId = req.organization?.id || '';
      const callerRole = req.membership!.role;
      const isSuperAdmin = req.user!.isSuperAdmin;

      const queryResult = bookingListQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        throw new ValidationError('Invalid query parameters', queryResult.error.format());
      }

      const { bookings, total, page, limit } = await bookingService.listBookings(
        callerUserId,
        callerOrgId,
        callerRole,
        queryResult.data,
        isSuperAdmin
      );

      res.json({
        success: true,
        data: bookings,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const callerUserId = req.user!.id;
      const callerOrgId = req.organization?.id || '';
      const callerRole = req.membership!.role;
      const isSuperAdmin = req.user!.isSuperAdmin;

      const booking = await bookingService.getBookingById(
        id,
        callerUserId,
        callerOrgId,
        callerRole,
        isSuperAdmin
      );

      res.json({ success: true, data: booking });
    } catch (error) {
      next(error);
    }
  }

  async review(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const reviewerUserId = req.user!.id;
      const reviewerOrgId = req.organization!.id;
      const isSuperAdmin = req.user!.isSuperAdmin;

      const updated = await bookingService.reviewBooking(
        id,
        reviewerUserId,
        reviewerOrgId,
        req.body,
        isSuperAdmin
      );

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const recorderUserId = req.user!.id;

      const payment = await bookingService.recordPayment(id, recorderUserId, req.body);
      res.status(201).json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  }

  async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, paymentId } = req.params;
      const verifierUserId = req.user!.id;
      const verifierOrgId = req.organization!.id;
      const isSuperAdmin = req.user!.isSuperAdmin;

      const updatedPayment = await bookingService.verifyPayment(
        id,
        paymentId,
        verifierUserId,
        verifierOrgId,
        req.body,
        isSuperAdmin
      );

      res.json({ success: true, data: updatedPayment });
    } catch (error) {
      next(error);
    }
  }

  async confirm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const confirmerUserId = req.user!.id;
      const confirmerOrgId = req.organization!.id;
      const isSuperAdmin = req.user!.isSuperAdmin;

      const confirmed = await bookingService.confirmBooking(
        id,
        confirmerUserId,
        confirmerOrgId,
        isSuperAdmin
      );

      res.json({ success: true, data: confirmed });
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const cancellerUserId = req.user!.id;
      const cancellerOrgId = req.organization?.id || '';
      const callerRole = req.membership!.role;
      const isSuperAdmin = req.user!.isSuperAdmin;

      const cancelled = await bookingService.cancelBooking(
        id,
        cancellerUserId,
        cancellerOrgId,
        callerRole,
        req.body,
        isSuperAdmin
      );

      res.json({ success: true, data: cancelled });
    } catch (error) {
      next(error);
    }
  }
}

export const bookingController = new BookingController();

