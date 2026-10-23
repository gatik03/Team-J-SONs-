import express, { Express } from 'express';
import cors from 'cors';
import { aiRouter } from './ai/index';
import { authRouter } from './core/auth/router';
import { productRouter } from './core/product/router';
import { emiRouter } from './core/emi/router';
import { customerRouter } from './core/customer/router';
import { applicationRouter } from './core/application/router';
import { notFound, errorHandler } from './common/errors';

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: 'http://localhost:5173' }));
  app.use(express.json({ limit: '1mb' }));

  // Core routers
  app.use('/api/auth', authRouter);
  app.use('/api/products', productRouter);
  app.use('/api/emi', emiRouter);
  app.use('/api/customers', customerRouter);
  app.use('/api/applications', applicationRouter);

  // AI router (owned by S2)
  app.use('/api', aiRouter);

  // Errors always last
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
