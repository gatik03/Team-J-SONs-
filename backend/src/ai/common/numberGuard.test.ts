import { describe, expect, it } from 'vitest';
import { onlyKnownNumbers } from './numberGuard';

describe('onlyKnownNumbers', () => {
  it('accepts known numbers, including comma-formatted ones', () => expect(onlyKnownNumbers('60-month tenure, EMI 10,871 (about 18%)', [60, 10871, 18, null])).toBe(true));
  it('rejects an invented number', () => expect(onlyKnownNumbers('60-month tenure, EMI about 11,500', [60, 10871])).toBe(false));
  it('accepts text without numbers', () => expect(onlyKnownNumbers('A comfortable tenure for you', [])).toBe(true));
});
