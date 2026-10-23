import { beforeEach, describe, expect, it, vi } from 'vitest';
import { structured } from '../config/llm';
import { askPolicy } from './policyAssistant';
import { retrieve, type RetrievedChunk } from './retriever';
import { SAFE_ANSWER } from './schemas';

vi.mock('../config/llm', () => ({ structured: vi.fn() }));
vi.mock('./retriever', async (orig) => ({ ...(await orig<typeof import('./retriever')>()), retrieve: vi.fn() }));

const chunk = (id: string, section: string, distance: number): RetrievedChunk => ({ id, section, content: `${section}: Foreclosure after 6 EMIs, charge 2%.`,
  title: 'Vehicle Loan Terms and Conditions', version: '2026.3', effectiveDate: '2026-07-01', audience: 'CUSTOMER', loanType: 'VEHICLE', distance });

describe('askPolicy (LLM + retrieval mocked)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('no chunk within MAX_DISTANCE → SAFE_ANSWER without calling the LLM', async () => {
    vi.mocked(retrieve).mockResolvedValue([chunk('a', 'Late Payment', 0.9)]);
    expect(await askPolicy('What is the capital of France?', {}, 'CUSTOMER')).toEqual(SAFE_ANSWER);
    expect(structured).not.toHaveBeenCalled();
  });

  it('builds sources in code from valid used ids, de-duplicated, masks PII in the question', async () => {
    vi.mocked(retrieve).mockResolvedValue([chunk('a', 'Foreclosure and Part-Prepayment', 0.2), chunk('b', 'Late Payment', 0.3)]);
    vi.mocked(structured).mockResolvedValue({ answer: 'Foreclosure is allowed after 6 EMIs.', confidence: 'LOW', usedChunkIds: ['C1', 'C1', 'C9'], followUpRequired: false });
    const a = await askPolicy('My PAN ABCDE1234F, can I foreclose?', {}, 'CUSTOMER');
    expect(vi.mocked(retrieve).mock.calls[0]![0]).toContain('XXXXX1234X');
    expect(a).toEqual({ answer: 'Foreclosure is allowed after 6 EMIs.', confidence: 'LOW', followUpRequired: true,
      sources: [{ document: 'Vehicle Loan Terms and Conditions', section: 'Foreclosure and Part-Prepayment', version: '2026.3', effectiveDate: '2026-07-01' }] });
    expect(vi.mocked(structured).mock.calls[0]![0].prompt).toContain('[C1] (Vehicle Loan Terms and Conditions › Foreclosure and Part-Prepayment, version 2026.3, effective 2026-07-01)');
  });

  it('NOT_FOUND or only invented ids → SAFE_ANSWER', async () => {
    vi.mocked(retrieve).mockResolvedValue([chunk('a', 'Late Payment', 0.2)]);
    vi.mocked(structured).mockResolvedValueOnce({ answer: 'NOT_FOUND', confidence: 'LOW', usedChunkIds: [], followUpRequired: true });
    expect(await askPolicy('q??', {}, 'CUSTOMER')).toEqual(SAFE_ANSWER);
    vi.mocked(structured).mockResolvedValueOnce({ answer: 'x', confidence: 'HIGH', usedChunkIds: ['C7'], followUpRequired: false });
    expect(await askPolicy('q??', {}, 'CUSTOMER')).toEqual(SAFE_ANSWER);
  });

  it('refuses figures absent from the cited passages', async () => {
    vi.mocked(retrieve).mockResolvedValue([chunk('a', 'Foreclosure and Part-Prepayment', 0.2)]);
    vi.mocked(structured).mockResolvedValue({ answer: 'Foreclosure has a 9% charge.', confidence: 'HIGH', usedChunkIds: ['C1'], followUpRequired: false });
    expect(await askPolicy('What is the foreclosure charge?', {}, 'CUSTOMER')).toEqual(SAFE_ANSWER);
  });
});
