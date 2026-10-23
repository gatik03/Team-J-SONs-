import express, { Express } from 'express';
import cors from 'cors';
import { aiRouter } from './ai/index';
import { notFound, errorHandler } from './common/errors';

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: 'http://localhost:5173' }));
  app.use(express.json({ limit: '1mb' }));

  // AI router (owned by S2)
  app.use('/api', aiRouter);

  // Errors always last
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
