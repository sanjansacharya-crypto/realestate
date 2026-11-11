import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const timestamp = new Date().toISOString();

    // Do not log health checks in test environment to keep test output clean
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[${timestamp}] ${method} ${originalUrl} ${statusCode} - ${duration}ms`);
    }
  });

  next();
}
