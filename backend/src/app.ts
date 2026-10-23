import express, { Express } from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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

  const frontend = fileURLToPath(new URL('../../frontend/dist/', import.meta.url));
  if (existsSync(frontend + 'index.html')) {
    app.use(express.static(frontend));
    app.get('*', (req, res, next) => req.path === '/api' || req.path.startsWith('/api/') ? next() : res.sendFile(frontend + 'index.html'));
  }

  // Errors always last
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
