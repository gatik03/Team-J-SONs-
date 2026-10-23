import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { plainText, structured } from './llm';

vi.mock('ai', () => ({ generateObject: vi.fn(), generateText: vi.fn() }));
vi.mock('../../config/env', () => ({ env: { NODE_ENV: 'test', LL_AI_API_KEY: 'test', LL_AI_BASE_URL: 'https://example.test/v1', LL_AI_CHAT_MODEL: 'test' } }));

describe('LLM boundary', () => {
  beforeEach(() => vi.resetAllMocks());

  it('masks prompts and system text, bounds calls and retries a structured failure once', async () => {
    vi.mocked(generateObject).mockRejectedValueOnce(new Error('Provider failed')).mockResolvedValueOnce({ object: { answer: 'OK' } } as never);
    expect(await structured({ schema: z.object({ answer: z.string() }), system: 'PAN ABCDE1234F', prompt: 'Aadhaar 1234 5678 9012' })).toEqual({ answer: 'OK' });
    expect(generateObject).toHaveBeenCalledTimes(2);
    expect(vi.mocked(generateObject).mock.calls[0][0]).toMatchObject({ system: 'PAN XXXXX1234X', prompt: 'Aadhaar XXXX-XXXX-9012', abortSignal: expect.any(AbortSignal) });
  });

  it('two structured failures become the public 503 envelope error', async () => {
    vi.mocked(generateObject).mockRejectedValue(new Error('Private provider detail'));
    await expect(structured({ schema: z.object({ answer: z.string() }), system: 's', prompt: 'p' }))
      .rejects.toMatchObject({ status: 503, code: 'AI_UNAVAILABLE', message: 'The AI service is unavailable. Please try again.' });
    expect(generateObject).toHaveBeenCalledTimes(2);
  });

  it('trims plain text and maps a failed completion to 503', async () => {
    vi.mocked(generateText).mockResolvedValueOnce({ text: ' OK \n' } as never).mockRejectedValueOnce(new Error('Private provider detail'));
    expect(await plainText({ system: 'PAN ABCDE1234F', prompt: 'Account 50100123456789' })).toBe('OK');
    expect(vi.mocked(generateText).mock.calls[0][0]).toMatchObject({ system: 'PAN XXXXX1234X', prompt: 'Account XXXXXXXXXX6789', abortSignal: expect.any(AbortSignal) });
    await expect(plainText({ system: 's', prompt: 'p' })).rejects.toMatchObject({ status: 503, code: 'AI_UNAVAILABLE' });
  });
});
