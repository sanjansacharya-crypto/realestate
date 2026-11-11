import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { notFoundHandler } from './middleware/notFoundHandler';
import { errorHandler } from './middleware/errorHandler';
import { healthRouter } from './modules/health/health.routes';
import { authRouter } from './modules/auth/auth.routes';
import { projectRouter } from './modules/projects/project.routes';
import { bookingRouter } from './modules/bookings/booking.routes';
import { workRouter } from './modules/work/work.routes';
import { modificationRouter } from './modules/modifications/modification.routes';
import { inventoryRouter } from './modules/inventory/inventory.routes';
import { attendanceRouter } from './modules/attendance/attendance.routes';
import { supportRouter } from './modules/support/support.routes';

export function createApp(): Application {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use(requestLogger);

  // Route mounting
  const apiRouter = express.Router();
  apiRouter.use('/health', healthRouter);
  apiRouter.use('/auth', authRouter);
  apiRouter.use('/projects', projectRouter);
  apiRouter.use('/bookings', bookingRouter);
  apiRouter.use('/work-packages', workRouter);
  apiRouter.use('/modification-requests', modificationRouter);
  apiRouter.use('/inventory', inventoryRouter);
  apiRouter.use('/attendance', attendanceRouter);
  apiRouter.use('/support', supportRouter);

  app.use(env.API_PREFIX, apiRouter);

  // 404 handler
  app.use(notFoundHandler);

  // Central error handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
