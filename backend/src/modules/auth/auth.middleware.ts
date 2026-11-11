import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { UnauthorizedError } from '../../common/errors/appError';
import { JwtAccessTokenPayload } from './auth.types';
import { authService } from './auth.service';

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('Authentication required. Missing Authorization header.');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedError('Invalid Authorization format. Expected Bearer <token>.');
    }

    const token = parts[1];
    let payload: JwtAccessTokenPayload;

    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessTokenPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Access token has expired');
      }
      throw new UnauthorizedError('Invalid access token');
    }

    if (!payload.sub) {
      throw new UnauthorizedError('Malformed token payload');
    }

    // Retrieve active user from database to ensure account wasn't deactivated/deleted
    const user = await authService.getMe(payload.sub);
    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
}
