import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

export const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  LL_JWT_SECRET: z.string().min(8).default('dev-only-change-me'),
  LL_SERVER_PORT: z.coerce.number().int().positive().default(8080),
  LL_AI_BASE_URL: z.string().url().default('https://integrate.api.nvidia.com/v1'),
  LL_AI_API_KEY: z.string().default(''),
  LL_AI_CHAT_MODEL: z.string().default('meta/llama-3.1-70b-instruct'),
  LL_EMBED_API_KEY: z.string().min(1, 'LL_EMBED_API_KEY is required: a Gemini key from aistudio.google.com (needed for embeddings even if chat uses NVIDIA)'),
  LL_EMBED_MODEL: z.string().default('gemini-embedding-001'),
  LL_EMBED_DIMENSIONS: z.coerce.number().int().positive().default(768),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
  throw new Error(`Invalid environment: ${issues}`);
}

export const env = parsed.data;
export type Env = z.infer<typeof EnvSchema>;
