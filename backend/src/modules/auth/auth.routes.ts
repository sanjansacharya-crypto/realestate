import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from './auth.middleware';
import { validateBody } from '../../middleware/validateRequest';
import { authRateLimiter } from '../../middleware/rateLimiter';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
} from './auth.validation';

export const authRouter = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user (and optional organization)
 * @access  Public
 */
authRouter.post(
  '/register',
  authRateLimiter,
  validateBody(registerSchema),
  authController.register.bind(authController)
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user and retrieve tokens
 * @access  Public
 */
authRouter.post(
  '/login',
  authRateLimiter,
  validateBody(loginSchema),
  authController.login.bind(authController)
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Exchange valid refresh token for a new access token & rotated refresh token
 * @access  Public
 */
authRouter.post(
  '/refresh',
  authRateLimiter,
  validateBody(refreshTokenSchema),
  authController.refresh.bind(authController)
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Revoke session refresh token
 * @access  Public / Optional Auth
 */
authRouter.post(
  '/logout',
  validateBody(logoutSchema),
  authController.logout.bind(authController)
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get currently authenticated user's profile and memberships
 * @access  Private (Bearer token)
 */
authRouter.get('/me', authenticate, authController.me.bind(authController));
