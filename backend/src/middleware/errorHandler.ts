import { Request, Response, NextFunction } from 'express';
import { AppError } from '../common/errors/appError';
import { env } from '../config/env';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const prismaCode = 'code' in err && typeof (err as { code?: unknown }).code === 'string'
    ? (err as { code: string }).code
    : undefined;
  const databaseUnavailable = prismaCode === 'P1001' || prismaCode === 'P1002' || prismaCode === 'P1017';
  const isAppError = err instanceof AppError;
  const statusCode = databaseUnavailable ? 503 : isAppError ? err.statusCode : 500;
  const message = databaseUnavailable
    ? 'The database is temporarily unavailable. Please try again shortly.'
    : isAppError ? err.message : 'Internal server error';

  if (!isAppError) {
    if (databaseUnavailable) {
      console.error('Database temporarily unavailable:', prismaCode);
    } else {
      console.error('Unhandled Server Error:', err);
    }
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(isAppError && 'errors' in err && { details: (err as any).errors }),
      ...(env.NODE_ENV === 'development' && {
        stack: err.stack,
      }),
    },
  });
}
