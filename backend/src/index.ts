import { env } from './config/env';
import { logger } from './common/logger';
import { createApp } from './app';

createApp().listen(env.LL_SERVER_PORT, () => {
  logger.info(`LoanLens API on http://localhost:${env.LL_SERVER_PORT}`);
});
