import { logger } from '../../common/logger';
import { structured } from '../config/llm';
import { onlyKnownNumbers } from '../common/numberGuard';
import { maskPii } from '../masking/piiMasker';
import { MAX_DISTANCE, retrieve, type Audience, type RetrieveFilters, type RetrieveOptions } from './retriever';
import { GroundedSchema, PolicyAnswerSchema, SAFE_ANSWER, type PolicyAnswer } from './schemas';

export const POLICY_SYSTEM_PROMPT = `You are Kestrel Bank's lending policy assistant.
Answer the question using ONLY the numbered context passages. Each passage starts with an id such as [C1].
Rules:
1. Use only facts written in the context. Never use outside or general knowledge, even if you believe you know the answer.
2. Quote figures (percentages, rupee amounts, days, months, EMIs, credit scores) exactly as written in the context. Do not calculate, convert or round any number. If the exact figure asked for is not written in the context, state the rule that is written instead.
3. If the context does not contain the answer, set "answer" to "NOT_FOUND", "confidence" to "LOW", "usedChunkIds" to [] and "followUpRequired" to true.
4. "usedChunkIds" lists the id of every passage you used, for example ["C1","C3"].
5. Write 1 to 3 short sentences in plain language a customer can understand. No markdown, no legal jargon.
6. Never include personal data such as PAN, Aadhaar or account numbers.
7. confidence is "HIGH" when one passage states the answer directly, "MEDIUM" when you combined passages or the passage only partly answers, otherwise "LOW".
8. followUpRequired is true when the customer must contact the bank or give more information to get a complete answer, otherwise false.
Return only a JSON object with exactly these keys: answer (string), confidence ("HIGH" | "MEDIUM" | "LOW"), usedChunkIds (array of strings), followUpRequired (boolean).`;

/** M2-6/M2-7: grounded answer from retrieved approved chunks only; sources are built in code, never by the LLM. */
export async function askPolicy(question: string, filters: RetrieveFilters, audience: Audience, opts: RetrieveOptions = {}): Promise<PolicyAnswer> {
  const q = maskPii(question);
  const chunks = (await retrieve(q, audience, filters, 5, opts)).filter((c) => c.distance <= MAX_DISTANCE);
  logger.info({ audience, chunkIds: chunks.map((c) => c.id), topDistance: chunks[0]?.distance ?? null }, 'policy retrieval');
  if (chunks.length === 0) return SAFE_ANSWER;

  const labelled = new Map(chunks.map((c, i) => [`C${i + 1}`, c]));
  const context = [...labelled].map(([id, c]) =>
    `[${id}] (${c.title} › ${c.section}, version ${c.version}, effective ${c.effectiveDate})\n${c.content}`).join('\n\n');
  const g = await structured({ schema: GroundedSchema, system: POLICY_SYSTEM_PROMPT, prompt: `Context:\n${context}\n\nQuestion: ${q}` });

  const used = [...new Set(g.usedChunkIds)].flatMap((id) => labelled.get(id) ?? []);
  if (g.answer.trim() === 'NOT_FOUND' || used.length === 0) return SAFE_ANSWER;
  const numbers = used.flatMap((c) => (c.content.match(/\d[\d,]*(\.\d+)?/g) ?? []).map((n) => Number(n.replace(/,/g, ''))));
  if (!onlyKnownNumbers(g.answer, numbers)) return SAFE_ANSWER;
  const sources = [...new Map(used.map((c) => [`${c.title}|${c.section}|${c.version}`,
    { document: c.title, section: c.section, version: c.version, effectiveDate: c.effectiveDate }])).values()];
  return PolicyAnswerSchema.parse({ answer: maskPii(g.answer), confidence: g.confidence, sources,
    followUpRequired: g.confidence === 'LOW' ? true : g.followUpRequired });
}
