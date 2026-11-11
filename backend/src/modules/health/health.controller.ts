import { Request, Response } from 'express';
import { env } from '../../config/env';
import { checkDatabaseConnection } from '../../config/db';

export class HealthController {
  public static async getHealth(_req: Request, res: Response): Promise<void> {
    const dbStatus = await checkDatabaseConnection();

    res.status(200).json({
      success: true,
      data: {
        status: dbStatus.connected ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        environment: env.NODE_ENV,
        database: {
          connected: dbStatus.connected,
          ...(dbStatus.latencyMs !== undefined && { latencyMs: dbStatus.latencyMs }),
          ...(dbStatus.error && { error: dbStatus.error }),
        },
      },
    });
  }
}
