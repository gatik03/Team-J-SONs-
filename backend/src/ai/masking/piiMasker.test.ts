import { describe, expect, it } from 'vitest';
import { maskObject, maskPii } from './piiMasker';

describe('maskPii', () => {
  it.each([
    ['My PAN is ABCDE1234F', 'My PAN is XXXXX1234X'],
    ['Aadhaar 1234 5678 9012', 'Aadhaar XXXX-XXXX-9012'],
    ['1234-5678-9012', 'XXXX-XXXX-9012'],
    ['123456789012', 'XXXX-XXXX-9012'],
    ['Acct 50100123456789', 'Acct XXXXXXXXXX6789'],
    ['ref 123456789', 'ref XXXXX6789'],
    ['call 9876543210', 'call XXXXXX3210'],
    ['Loan 500000 at 11% for 60 months', 'Loan 500000 at 11% for 60 months'],
    ['12345678', '12345678'],
  ])('%s', (input, expected) => expect(maskPii(input)).toBe(expected));
});

describe('maskObject', () => {
  it('masks deeply without mutating the input', () => {
    const input = { a: { pan: 'ABCDE1234F' }, list: ['1234 5678 9012'], n: 123456789012, ok: 5 };
    const copy = structuredClone(input);
    expect(maskObject(input)).toEqual({ a: { pan: 'XXXXX1234X' }, list: ['XXXX-XXXX-9012'], n: 'XXXX-XXXX-9012', ok: 5 });
    expect(input).toEqual(copy);
  });
});
