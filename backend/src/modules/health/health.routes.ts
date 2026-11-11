import { Router } from 'express';
import { HealthController } from './health.controller';

export const healthRouter = Router();

healthRouter.get('/', HealthController.getHealth);
