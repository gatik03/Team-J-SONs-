import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { AuthUser } from '../../common/auth';
import { logger } from '../../common/logger';
import { onlyKnownNumbers } from '../common/numberGuard';
import { structured } from '../config/llm';
import { calculateEmi, getCustomer, listProducts, obligationRatioPct } from '../coreBridge';
import { maskPii } from '../masking/piiMasker';
import { AdvisorResponseSchema, DISCLAIMER, type AdvisorRecommendation, type AdvisorResponse } from './schemas';

const ExtractionSchema = z.object({
  interpretedRequirement: z.string(),
  loanAmount: z.number().nullable(),
  monthlyIncome: z.number().nullable(),
  annualIncome: z.number().nullable(),
  maxPreferredEmi: z.number().nullable(),
  purpose: z.string().nullable(),
  loanTypeGuess: z.enum(['PERSONAL', 'HOME', 'VEHICLE', 'EDUCATION']).nullable(),
  clarifyingQuestion: z.string().nullable(),
});
type Extraction = z.infer<typeof ExtractionSchema>;

const EXTRACT_SYSTEM = `You extract loan requirements for Kestrel Bank's AI loan advisor. You do NOT recommend products and you do NOT calculate EMIs, ratios or eligibility.
Read the customer's message (and the "Known so far" facts if present) and return a JSON object with exactly these keys:
- interpretedRequirement: one short sentence restating the need, for example "Used car loan of 5 lakh with EMI below 12,000".
- loanAmount: the amount the customer wants to borrow, in whole rupees, or null.
- monthlyIncome: monthly income in whole rupees if the customer states a monthly figure, else null.
- annualIncome: yearly income in whole rupees if the customer states a yearly figure, else null. Never convert yearly to monthly yourself.
- maxPreferredEmi: the highest monthly EMI the customer wants, in whole rupees, or null.
- purpose: what the loan is for, in a few words of the customer's own language (for example "used car"), or null.
- loanTypeGuess: VEHICLE for cars, bikes, two-wheelers; HOME for buying, building or renovating a house or flat; EDUCATION for studies, college or course fees; PERSONAL for weddings, medical bills, travel, debt consolidation or other personal needs; null if unclear.
- clarifyingQuestion: if loanAmount is null OR purpose is null, ask exactly ONE short, friendly question that asks only for the missing item(s); otherwise null.
Write Indian amounts as plain integers: "5 lakh" = 500000, "5L" = 500000, "1.5 lakh" = 150000, "1 crore" = 10000000, "60k" = 60000, "₹60,000" = 60000, "12,000" = 12000.
Never invent a value that is not in the message or the known facts. Use null when unsure.`;

const REASON_SYSTEM = `You write the "reason" text for loan recommendations shown to a customer.
For each item write ONE plain-language sentence of at most 20 words explaining why this tenure suits the customer.
Use only the numbers given in the item, exactly as written. Do not calculate, round or add any other number. Do not promise approval.
Return only a JSON object: {"reasons":[{"productId": string, "reason": string}]} with one entry per item and the same productIds.`;
const ReasonsSchema = z.object({ reasons: z.array(z.object({ productId: z.string(), reason: z.string() })) });

// shortcut: in-memory, lost on restart, capped at 500 entries; move to DB if multi-instance.
const conversations = new Map<string, Extraction>();
const remember = (id: string, x: Extraction) => {
  conversations.delete(id);
  conversations.set(id, x);
  if (conversations.size > 500) conversations.delete(conversations.keys().next().value!);
};

const USED = ['used', 'pre-owned', 'preowned', 'second-hand', 'second hand'];
const NEW = ['new'];
const hasWord = (text: string, words: string[]) => words.some((w) => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(text));
const round = (n: number | null) => (n != null && Number.isFinite(n) ? Math.round(n) : null);

const ASK_BOTH = 'How much would you like to borrow, and what is the loan for (for example a used car, a home, education or personal needs)?';
const ASK_AMOUNT = 'How much would you like to borrow?';
const ASK_PURPOSE = 'What is the loan for (for example a used car, a home, education or personal needs)?';

interface Scored { rec: AdvisorRecommendation; fitsPreference: boolean; pctOfIncome: number | null }

export async function advisorChat(message: string, conversationId: string | null, user: AuthUser): Promise<AdvisorResponse> {
  const id = conversationId ?? `CONV-${randomUUID().slice(0, 8)}`;
  const memoryKey = `${user.username}:${id}`;
  const previous = conversations.get(memoryKey);

  // Step 1 — the LLM only extracts; it never computes.
  const extraction = await structured({ schema: ExtractionSchema, system: EXTRACT_SYSTEM, maxOutputTokens: 512,
    prompt: `Known so far: ${previous ? JSON.stringify(previous) : 'nothing'}\nCustomer message: ${maskPii(message)}` });
  const merged = { ...(previous ?? {}) } as Extraction;
  for (const [k, v] of Object.entries(extraction)) if (v != null) (merged as Record<string, unknown>)[k] = v;
  remember(memoryKey, merged);

  // Step 2 — code only.
  const monthlyIncome = round(merged.monthlyIncome ?? (merged.annualIncome != null ? merged.annualIncome / 12 : NaN));
  const loanAmount = round(merged.loanAmount ?? null);
  const maxPreferredEmi = round(merged.maxPreferredEmi ?? null);
  const base = { interpretedRequirement: extraction.interpretedRequirement, loanAmount, monthlyIncome, maxPreferredEmi,
    currency: 'INR' as const, disclaimer: DISCLAIMER, conversationId: id };

  if (loanAmount == null || merged.purpose == null || merged.loanTypeGuess == null) {
    const fallback = loanAmount == null && (merged.purpose == null || merged.loanTypeGuess == null) ? ASK_BOTH : loanAmount == null ? ASK_AMOUNT : ASK_PURPOSE;
    return AdvisorResponseSchema.parse({ ...base, recommendations: [], clarifyingQuestion: extraction.clarifyingQuestion ?? fallback });
  }
  const purpose = merged.purpose;
  const loanType = merged.loanTypeGuess;
  const interpretedRequirement = extraction.interpretedRequirement || `${purpose} loan of ₹${loanAmount}`;

  const customer = user.role === 'CUSTOMER' && user.customerId ? await getCustomer(user.customerId) : null;
  const obligations = customer?.existingMonthlyObligations ?? 0;

  let candidates = (await listProducts()).filter((p) => p.loanType === loanType && p.minAmount <= loanAmount && loanAmount <= p.maxAmount
    && (!customer || p.eligibilityCriteria.allowedSegments.includes(customer.segment)));
  const purposeLc = purpose.toLowerCase();
  for (const group of [USED, NEW]) {
    if (!hasWord(purposeLc, group)) continue;
    const matching = candidates.filter((p) => hasWord(`${p.name} ${p.description}`.toLowerCase(), group));
    if (matching.length) { candidates = matching; break; }
  }
  if (!candidates.length) {
    return AdvisorResponseSchema.parse({ ...base, interpretedRequirement, recommendations: [],
      clarifyingQuestion: `None of our ${loanType.toLowerCase()} loans cover ₹${loanAmount.toLocaleString('en-IN')}. Would you like to try a different amount?` });
  }

  const scored: Scored[] = candidates.map((p) => {
    const rate = Number(p.indicativeRate ?? p.minInterestRate);
    const limit = p.eligibilityCriteria.maxObligationRatioPercent;
    const grid: number[] = [];
    for (let t = Math.ceil(p.minTenureMonths / 12) * 12; t <= p.maxTenureMonths; t += 12) grid.push(t);
    if (!grid.length) grid.push(p.maxTenureMonths);
    const fits = (emi: number) => maxPreferredEmi != null ? emi <= maxPreferredEmi
      : monthlyIncome != null ? obligationRatioPct(monthlyIncome, obligations, emi) <= limit : true;
    let tenure: number;
    let fitsPreference = true;
    if (maxPreferredEmi == null && monthlyIncome == null) {
      tenure = [...grid].reverse().find((t) => t <= 60) ?? grid[0];
    } else {
      const ok = grid.find((t) => fits(calculateEmi(loanAmount, rate, t)));
      tenure = ok ?? grid[grid.length - 1];
      fitsPreference = ok != null;
    }
    const estimatedEmi = calculateEmi(loanAmount, rate, tenure);
    let eligibilityIndicator: AdvisorRecommendation['eligibilityIndicator'] = 'UNKNOWN';
    if (monthlyIncome != null) {
      const ratio = obligationRatioPct(monthlyIncome, obligations, estimatedEmi);
      eligibilityIndicator = monthlyIncome < p.eligibilityCriteria.minMonthlyIncome ? 'UNLIKELY_ELIGIBLE'
        : ratio <= limit ? 'LIKELY_ELIGIBLE' : ratio <= limit + 5 ? 'BORDERLINE' : 'UNLIKELY_ELIGIBLE';
    }
    const pctOfIncome = monthlyIncome != null ? Math.round(obligationRatioPct(monthlyIncome, 0, estimatedEmi)) : null;
    const fallback = !fitsPreference ? `Even at the longest tenure of ${tenure} months the EMI is above your preferred limit`
      : pctOfIncome != null ? `${tenure}-month tenure keeps EMI within the limit (about ${pctOfIncome}% of income)`
        : maxPreferredEmi != null ? `${tenure}-month tenure keeps EMI within your preferred limit`
          : `${tenure}-month tenure at the ${rate}% indicative rate keeps the EMI manageable`;
    return { rec: { productId: p.productId, productName: p.name, indicativeInterestRate: rate, tenureMonths: tenure, estimatedEmi,
      reason: fallback, eligibilityIndicator }, fitsPreference, pctOfIncome };
  });
  scored.sort((a, b) => Number(b.fitsPreference) - Number(a.fitsPreference) || a.rec.estimatedEmi - b.rec.estimatedEmi);
  const top = scored.slice(0, 3);

  // Step 3 — the LLM writes only the reason text; every number is guarded, else the template above stays.
  try {
    // Optional wording must not hold up the already-calculated recommendations.
    const { reasons } = await structured({ schema: ReasonsSchema, system: REASON_SYSTEM, timeoutMs: 3000, retries: 0, maxOutputTokens: 256, prompt: JSON.stringify(top.map((s) => ({
      productId: s.rec.productId, productName: s.rec.productName, tenureMonths: s.rec.tenureMonths, estimatedEmi: s.rec.estimatedEmi,
      indicativeInterestRate: s.rec.indicativeInterestRate, maxPreferredEmi, pctOfIncome: s.pctOfIncome, fitsPreference: s.fitsPreference,
      eligibilityIndicator: s.rec.eligibilityIndicator }))) });
    for (const s of top) {
      const r = reasons.find((x) => x.productId === s.rec.productId)?.reason.trim();
      const allowed = [s.rec.tenureMonths, s.rec.estimatedEmi, s.rec.indicativeInterestRate, maxPreferredEmi, s.pctOfIncome, loanAmount, monthlyIncome];
      if (r && r.length <= 200 && !/approved|guarantee/i.test(r) && onlyKnownNumbers(r, allowed)) s.rec.reason = r;
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'advisor reason LLM failed; using templates');
  }

  return AdvisorResponseSchema.parse({ ...base, interpretedRequirement, recommendations: top.map((s) => s.rec), clarifyingQuestion: null });
}
