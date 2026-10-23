import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../coreBridge', async () => await import('../stub/core'));
vi.mock('../config/llm', () => ({ structured: vi.fn(), plainText: vi.fn() }));

import { structured } from '../config/llm';
import { advisorChat } from './advisorService';

const mocked = vi.mocked(structured);
const priya = { username: 'priya.sharma', role: 'CUSTOMER' as const, customerId: 'CUST-1001' };
const USED_CAR = { interpretedRequirement: 'Used car loan of 5 lakh with EMI below 12,000', loanAmount: 500000, monthlyIncome: 60000, annualIncome: null,
  maxPreferredEmi: 12000, purpose: 'used car', loanTypeGuess: 'VEHICLE', clarifyingQuestion: null };
const MSG = 'I need ₹5 lakh for a used car. I earn ₹60,000 per month and want an EMI below ₹12,000.';

describe('advisorChat', () => {
  beforeEach(() => mocked.mockReset());

  it('recommends VL-204 at 60 months / 10871 with the template reason when the reason LLM fails', async () => {
    mocked.mockResolvedValueOnce(USED_CAR).mockRejectedValueOnce(new Error('LLM down'));
    const r = await advisorChat(MSG, null, priya);
    expect(r.recommendations).toEqual([{ productId: 'VL-204', productName: 'Kestrel Pre-Owned Car Loan', indicativeInterestRate: 11, tenureMonths: 60,
      estimatedEmi: 10871, reason: '60-month tenure keeps EMI within the limit (about 18% of income)', eligibilityIndicator: 'LIKELY_ELIGIBLE' }]);
    expect(r).toMatchObject({ loanAmount: 500000, monthlyIncome: 60000, maxPreferredEmi: 12000, currency: 'INR',
      disclaimer: 'Indicative only. Final approval is subject to credit assessment.', clarifyingQuestion: null });
    expect(r.conversationId).toMatch(/^CONV-/);
    expect(mocked).toHaveBeenNthCalledWith(2, expect.objectContaining({ timeoutMs: 3000, retries: 0, maxOutputTokens: 256 }));
  });

  it('asks a clarifying question when amount and purpose are missing, then uses conversation memory', async () => {
    const q = 'How much would you like to borrow, and what is the loan for?';
    mocked.mockResolvedValueOnce({ interpretedRequirement: '', loanAmount: null, monthlyIncome: null, annualIncome: null, maxPreferredEmi: null,
      purpose: null, loanTypeGuess: null, clarifyingQuestion: q });
    const first = await advisorChat('I want a loan', null, priya);
    expect(first.recommendations).toEqual([]);
    expect(first.clarifyingQuestion).toBe(q);

    mocked.mockResolvedValueOnce({ ...USED_CAR, maxPreferredEmi: null, monthlyIncome: null }).mockRejectedValueOnce(new Error('LLM down'));
    mocked.mockClear();
    const second = await advisorChat('5 lakh for a used car', first.conversationId, priya);
    expect(second.recommendations[0].productId).toBe('VL-204');
  });

  it('number guard rejects an invented number in the reason', async () => {
    mocked.mockResolvedValueOnce(USED_CAR).mockResolvedValueOnce({ reasons: [{ productId: 'VL-204', reason: '60-month tenure, EMI about 11,500' }] });
    const r = await advisorChat(MSG, null, priya);
    expect(r.recommendations[0].reason).toBe('60-month tenure keeps EMI within the limit (about 18% of income)');
  });

  it('accepts a reason that only repeats known numbers', async () => {
    mocked.mockResolvedValueOnce(USED_CAR).mockResolvedValueOnce({ reasons: [{ productId: 'VL-204', reason: '60 months keeps your EMI at 10,871, under 12,000.' }] });
    const r = await advisorChat(MSG, null, priya);
    expect(r.recommendations[0].reason).toBe('60 months keeps your EMI at 10,871, under 12,000.');
  });

  it('never shares conversation facts between authenticated users', async () => {
    mocked.mockResolvedValueOnce(USED_CAR).mockRejectedValueOnce(new Error('LLM down'));
    const first = await advisorChat(MSG, null, priya);
    mocked.mockClear();
    mocked.mockResolvedValueOnce({ ...USED_CAR, loanAmount: null, monthlyIncome: null, maxPreferredEmi: null,
      purpose: null, loanTypeGuess: null, clarifyingQuestion: null });
    const second = await advisorChat('I want a loan', first.conversationId,
      { username: 'rahul.verma', role: 'CUSTOMER', customerId: 'CUST-1002' });
    expect(mocked.mock.calls[0][0].prompt).toContain('Known so far: nothing');
    expect(second.recommendations).toEqual([]);
    expect(second.loanAmount).toBeNull();
  });
});
