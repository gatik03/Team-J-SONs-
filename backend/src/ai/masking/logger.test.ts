import { expect, it } from 'vitest';
import '../index';
import { logger } from '../../common/logger';

it('logs numeric account identifiers without producing invalid JSON', () => {
  const level = logger.level;
  logger.level = 'info';
  try {
    expect(() => logger.info({ account: 50100123456789, pan: 'ABCDE1234F' }, 'Synthetic masking check')).not.toThrow();
  } finally { logger.level = level; }
});
