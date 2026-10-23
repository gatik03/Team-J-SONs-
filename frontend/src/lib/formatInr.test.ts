import { describe, expect, it } from 'vitest';
import { formatInr, formatPercent } from './formatInr';

describe('formatInr and formatPercent', () => {
  it('formats rupees according to Indian numbering system', () => {
    expect(formatInr(500000)).toBe('₹5,00,000');
    expect(formatInr(10871)).toBe('₹10,871');
    expect(formatInr(10000000)).toBe('₹1,00,00,000');
    expect(formatInr(0)).toBe('₹0');
  });

  it('formats percentages with one decimal place', () => {
    expect(formatPercent(11)).toBe('11.0%');
    expect(formatPercent(10.5)).toBe('10.5%');
  });
});
