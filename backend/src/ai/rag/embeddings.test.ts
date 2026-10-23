import { afterEach, describe, expect, it, vi } from 'vitest';
import { embed, embedMany } from 'ai';
import { embedDocuments, embedQuery, normalize } from './embeddings';

vi.mock('ai', () => ({
  embed: vi.fn(async () => ({ embedding: Array(768).fill(2) })),
  embedMany: vi.fn(async ({ values }: { values: string[] }) => ({ embeddings: values.map(() => Array(768).fill(2)) })),
}));
const norm = (v: number[]) => Math.hypot(...v);

describe('embeddings (no network)', () => {
  afterEach(() => { vi.clearAllMocks(); vi.useRealTimers(); });

  it('(a) embedDocuments batches by 100 with RETRIEVAL_DOCUMENT and returns unit vectors', async () => {
    const out = await embedDocuments(Array.from({ length: 250 }, (_, i) => `t${i}`));
    const calls = vi.mocked(embedMany).mock.calls.map(([a]) => a);
    expect(calls.map((a) => a.values.length)).toEqual([100, 100, 50]);
    for (const a of calls) expect(a.providerOptions).toEqual({ google: { outputDimensionality: 768, taskType: 'RETRIEVAL_DOCUMENT' } });
    expect(out).toHaveLength(250);
    for (const v of out) { expect(v).toHaveLength(768); expect(norm(v)).toBeCloseTo(1, 6); }
  });

  it('(b) embedQuery uses RETRIEVAL_QUERY and returns a unit vector', async () => {
    const v = await embedQuery('foreclosure charges');
    expect(vi.mocked(embed).mock.calls[0]![0].providerOptions).toEqual({ google: { outputDimensionality: 768, taskType: 'RETRIEVAL_QUERY' } });
    expect(norm(v)).toBeCloseTo(1, 6);
  });

  it('(c) retries once after 2 s on 429', async () => {
    vi.useFakeTimers();
    vi.mocked(embed).mockRejectedValueOnce({ statusCode: 429 });
    const p = embedQuery('q');
    await vi.advanceTimersByTimeAsync(2000);
    expect(await p).toHaveLength(768);
    expect(embed).toHaveBeenCalledTimes(2);
  });

  it('(d) non-429 failure → AI_UNAVAILABLE', async () => {
    vi.mocked(embed).mockRejectedValueOnce(new Error('boom'));
    await expect(embedQuery('q')).rejects.toMatchObject({ status: 503, code: 'AI_UNAVAILABLE' });
    expect(embed).toHaveBeenCalledTimes(1);
  });

  it('(e) wrong dimension throws', () => {
    expect(() => normalize(Array(767).fill(1))).toThrow(/767/);
  });

  it.each([NaN, Infinity, -Infinity])('rejects a non-finite embedding component: %s', (value) => {
    const vector = Array(768).fill(1) as number[];
    vector[0] = value;
    expect(() => normalize(vector)).toThrow();
  });

  it('document embedding failures become AI_UNAVAILABLE for upload routes', async () => {
    vi.mocked(embedMany).mockRejectedValueOnce(new Error('invalid API key'));
    await expect(embedDocuments(['text'])).rejects.toMatchObject({ status: 503, code: 'AI_UNAVAILABLE' });
  });
});
