import { generateObject, generateText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { z } from 'zod';
import { env } from '../../config/env';
import { AppError } from '../../common/errors';
import { logger } from '../../common/logger';
import { maskPii } from '../masking/piiMasker';

const provider = createOpenAICompatible({ name: 'llm', baseURL: env.LL_AI_BASE_URL, apiKey: env.LL_AI_API_KEY, supportsStructuredOutputs: false });
export const chatModel = provider(env.LL_AI_CHAT_MODEL);

const unavailable = () => new AppError(503, 'AI_UNAVAILABLE', 'The AI service is unavailable. Please try again.');

/** Structured LLM output validated by a zod schema. Prompt is PII-masked. One retry, then AI_UNAVAILABLE. */
export async function structured<T>(args: { schema: z.ZodType<T>; system: string; prompt: string }): Promise<T> {
  if (!env.LL_AI_API_KEY) throw unavailable();
  for (let attempt = 1; attempt <= 2; attempt++) {
    const t0 = Date.now();
    try {
      const { object } = await generateObject({ model: chatModel, schema: args.schema, system: maskPii(args.system), prompt: maskPii(args.prompt), temperature: 0, maxRetries: 1, abortSignal: AbortSignal.timeout(20_000) });
      logger.info({ kind: 'llm', ms: Date.now() - t0, attempt }, 'llm call');
      return object as T;
    } catch (err) {
      logger.warn({ kind: 'llm', ms: Date.now() - t0, attempt, err: (err as Error).message }, 'llm call failed');
    }
  }
  throw unavailable();
}

/** Plain-text LLM output (explanations, customer messages). Prompt is PII-masked. */
export async function plainText(args: { system: string; prompt: string; temperature?: number }): Promise<string> {
  if (!env.LL_AI_API_KEY) throw unavailable();
  const t0 = Date.now();
  try {
    const { text } = await generateText({ model: chatModel, system: maskPii(args.system), prompt: maskPii(args.prompt), temperature: args.temperature ?? 0.2, maxRetries: 1, abortSignal: AbortSignal.timeout(20_000) });
    logger.info({ kind: 'llm', ms: Date.now() - t0 }, 'llm call');
    return text.trim();
  } catch (err) {
    logger.warn({ kind: 'llm', ms: Date.now() - t0, err: (err as Error).message }, 'llm call failed');
    throw unavailable();
  }
}
