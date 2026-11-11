import { Router } from 'express';
import { bookingController } from './booking.controller';
import { authenticate } from '../auth/auth.middleware';
import { requireOrganizationRole } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validateRequest';
import {
  createBookingSchema,
  reviewBookingSchema,
  recordPaymentSchema,
  verifyPaymentSchema,
  cancelBookingSchema,
} from './booking.validation';
import { Role } from '@prisma/client';

export const bookingRouter = Router();

/**
 * @route   POST /api/v1/bookings
 * @desc    Submit a plot booking request (Buyer selects available plot)
 * @access  Private — BUYER, DEVELOPER, PLATFORM_ADMIN
 */
bookingRouter.post(
  '/',
  authenticate,
  requireOrganizationRole([Role.BUYER, Role.DEVELOPER, Role.PLATFORM_ADMIN]),
  validateBody(createBookingSchema),
  bookingController.create.bind(bookingController)
);

/**
 * @route   GET /api/v1/bookings
 * @desc    List bookings (Buyers see own; Developers see all in org)
 * @access  Private — BUYER, DEVELOPER, PLATFORM_ADMIN
 */
bookingRouter.get(
  '/',
  authenticate,
  requireOrganizationRole([Role.BUYER, Role.DEVELOPER, Role.PLATFORM_ADMIN]),
  bookingController.list.bind(bookingController)
);

/**
 * @route   GET /api/v1/bookings/:id
 * @desc    Get booking details, payments, and full audit timeline
 * @access  Private — BUYER, DEVELOPER, PLATFORM_ADMIN
 */
bookingRouter.get(
  '/:id',
  authenticate,
  requireOrganizationRole([Role.BUYER, Role.DEVELOPER, Role.PLATFORM_ADMIN]),
  bookingController.getById.bind(bookingController)
);

/**
 * @route   PATCH /api/v1/bookings/:id/review
 * @desc    Developer reviews/approves (sets temporary hold) or rejects request
 * @access  Private — DEVELOPER or PLATFORM_ADMIN
 */
bookingRouter.patch(
  '/:id/review',
  authenticate,
  requireOrganizationRole([Role.DEVELOPER, Role.PLATFORM_ADMIN]),
  validateBody(reviewBookingSchema),
  bookingController.review.bind(bookingController)
);

/**
 * @route   POST /api/v1/bookings/:id/payments
 * @desc    Record a payment against the booking (e.g. UTR / Cheque reference)
 * @access  Private — BUYER, DEVELOPER, PLATFORM_ADMIN
 */
bookingRouter.post(
  '/:id/payments',
  authenticate,
  requireOrganizationRole([Role.BUYER, Role.DEVELOPER, Role.PLATFORM_ADMIN]),
  validateBody(recordPaymentSchema),
  bookingController.recordPayment.bind(bookingController)
);

/**
 * @route   PATCH /api/v1/bookings/:id/payments/:paymentId/verify
 * @desc    Developer verifies or rejects recorded payment
 * @access  Private — DEVELOPER or PLATFORM_ADMIN
 */
bookingRouter.patch(
  '/:id/payments/:paymentId/verify',
  authenticate,
  requireOrganizationRole([Role.DEVELOPER, Role.PLATFORM_ADMIN]),
  validateBody(verifyPaymentSchema),
  bookingController.verifyPayment.bind(bookingController)
);

/**
 * @route   PATCH /api/v1/bookings/:id/confirm
 * @desc    Confirm booking and permanently mark plot as BOOKED
 * @access  Private — DEVELOPER or PLATFORM_ADMIN
 */
bookingRouter.patch(
  '/:id/confirm',
  authenticate,
  requireOrganizationRole([Role.DEVELOPER, Role.PLATFORM_ADMIN]),
  bookingController.confirm.bind(bookingController)
);

/**
 * @route   PATCH /api/v1/bookings/:id/cancel
 * @desc    Cancel booking and release plot back to AVAILABLE
 * @access  Private — BUYER, DEVELOPER, PLATFORM_ADMIN
 */
bookingRouter.patch(
  '/:id/cancel',
  authenticate,
  requireOrganizationRole([Role.BUYER, Role.DEVELOPER, Role.PLATFORM_ADMIN]),
  validateBody(cancelBookingSchema),
  bookingController.cancel.bind(bookingController)
);

