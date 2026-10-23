import { describe, it, expect } from 'vitest';
import { canTransition, assertTransition } from './stateMachine';
import { AppError } from '../../common/errors';

describe('stateMachine', () => {
  it('allows valid transitions', () => {
    expect(canTransition('DRAFT', 'SUBMITTED')).toBe(true);
    expect(canTransition('SUBMITTED', 'UNDER_VERIFICATION')).toBe(true);
    expect(canTransition('UNDER_REVIEW', 'APPROVED')).toBe(true);
    expect(canTransition('UNDER_REVIEW', 'REJECTED')).toBe(true);
    expect(canTransition('APPROVED', 'DISBURSED')).toBe(true);
  });

  it('rejects invalid transitions and throws 409 INVALID_STATE', () => {
    expect(() => assertTransition('DRAFT', 'APPROVED')).toThrowError(AppError);
    try {
      assertTransition('DRAFT', 'APPROVED');
    } catch (e: unknown) {
      const err = e as AppError;
      expect(err.status).toBe(409);
      expect(err.code).toBe('INVALID_STATE');
    }

    expect(() => assertTransition('SUBMITTED', 'APPROVED')).toThrow();
    expect(() => assertTransition('REJECTED', 'DISBURSED')).toThrow();
  });
});
