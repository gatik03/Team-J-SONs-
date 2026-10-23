import pino from 'pino';
import { env } from '../config/env';

let masker: (text: string) => string = (text) => text;
/** S2 calls setMasker(maskPii) once, from backend/src/ai/index.ts. Until then logs are unmasked. */
export function setMasker(fn: (text: string) => string): void {
  masker = fn;
}

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
  formatters: {
    log: (obj) => JSON.parse(masker(JSON.stringify(obj))) as Record<string, unknown>,
  },
  hooks: {
    logMethod(args, method) {
      method.apply(this, args.map((a) => (typeof a === 'string' ? masker(a) : a)) as typeof args);
    },
  },
});
