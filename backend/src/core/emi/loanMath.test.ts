import { describe, it, expect } from 'vitest';
import { calculateEmi, amortization, obligationRatioPct } from './loanMath';

describe('loanMath', () => {
  it('computes correct EMI for brief scenarios', () => {
    expect(calculateEmi(500000, 11, 60)).toBe(10871);
    expect(calculateEmi(500000, 12, 48)).toBe(13167);
    expect(calculateEmi(120000, 0, 12)).toBe(10000);
  });

  it('generates correct amortization schedule', () => {
    const sched = amortization(500000, 11, 60);
    expect(sched).toHaveLength(60);
    expect(sched[sched.length - 1].closingBalance).toBe(0);
    const sumPrincipal = sched.reduce((sum, r) => sum + r.principalComponent, 0);
    expect(sumPrincipal).toBe(500000);
    expect(sched[0].interestComponent).toBe(4583);
  });

  it('computes obligationRatioPct correctly', () => {
    expect(obligationRatioPct(60000, 8000, 10871)).toBe(31);
    expect(obligationRatioPct(0, 0, 1000)).toBe(100);
  });
});
