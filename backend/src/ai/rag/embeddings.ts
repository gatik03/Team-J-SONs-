import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { embed, embedMany } from 'ai';
import { env } from '../../config/env';
import { AppError } from '../../common/errors';
import { logger } from '../../common/logger';

const google = createGoogleGenerativeAI({ apiKey: env.LL_EMBED_API_KEY });
const model = google.textEmbeddingModel(env.LL_EMBED_MODEL); // 'gemini-embedding-001'
export const EMBEDDING_DIM = 768;
if (env.LL_EMBED_DIMENSIONS !== EMBEDDING_DIM) throw new Error(`LL_EMBED_DIMENSIONS must be ${EMBEDDING_DIM} to match vector(${EMBEDDING_DIM})`);
const opts = (taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY') =>
  ({ google: { outputDimensionality: EMBEDDING_DIM, taskType } });

// Gemini's truncated 768-dim output is not unit length; we use cosine distance <=>, so normalise before storing and before querying.
export function normalize(v: number[]): number[] {
  if (v.length !== EMBEDDING_DIM) throw new Error(`embedding has ${v.length} dims, expected ${EMBEDDING_DIM}`);
  const n = Math.hypot(...v);
  if (!n || !Number.isFinite(n)) throw new Error('embedding must have a finite, nonzero norm');
  return v.map((x) => x / n);
}

const is429 = (e: unknown) => (e as { statusCode?: number })?.statusCode === 429 || /429|RESOURCE_EXHAUSTED/.test(String(e));
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); }
  catch (e) {
    if (!is429(e)) throw e;
    await new Promise((r) => setTimeout(r, 2000));   // free-tier rate limit: wait 2 s, retry once
    return fn();
  }
}

/** Documents (ingest): batches of ≤ 100. Errors propagate so ingest fails loudly. */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  try {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += 100) {
      const values = texts.slice(i, i + 100);
      const { embeddings } = await withRetry(() =>
        embedMany({ model, values, maxRetries: 0, providerOptions: opts('RETRIEVAL_DOCUMENT'), abortSignal: AbortSignal.timeout(20_000) }));
      out.push(...embeddings.map(normalize));
    }
    return out;
  } catch (e) {
    logger.error({ err: e }, 'document embedding failed');
    throw new AppError(503, 'AI_UNAVAILABLE', 'The AI service is unavailable. Please try again.');
  }
}

/** Query (retrieval). Any failure → 503 AI_UNAVAILABLE: never answer without retrieval. */
export async function embedQuery(text: string): Promise<number[]> {
  try {
    const { embedding } = await withRetry(() =>
      embed({ model, value: text, maxRetries: 0, providerOptions: opts('RETRIEVAL_QUERY'), abortSignal: AbortSignal.timeout(20_000) }));
    return normalize(embedding);
  } catch (e) {
    logger.error({ err: e }, 'embedding failed');
    throw new AppError(503, 'AI_UNAVAILABLE', 'The AI service is unavailable. Please try again.');
  }
}
