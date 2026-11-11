import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * Rate limiter for sensitive authentication endpoints (login, register, token refresh)
 * to protect against brute-force attacks and credential stuffing.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 1000 : 20, // 20 attempts per 15 min in production/dev
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts. Please try again later.',
    },
  },
  skip: () => env.NODE_ENV === 'test',
});
