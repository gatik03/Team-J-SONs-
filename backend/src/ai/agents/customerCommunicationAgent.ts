import { plainText } from '../config/llm';
import { AgentPermissionDeniedError, invokeTool } from '../tools/permissionGuard';
import { joinLabels } from './documentVerificationAgent';
import type { AgentCheckInternal, AgentContext } from './types';

const SYSTEM = `You write short messages from Kestrel Bank to a loan applicant.
Write at most 2 short sentences in plain, polite English.
Say only what the customer needs to do next or what the current status is, based on the facts given.
Never mention credit scores, score bands, obligation ratios, risk bands, internal policies, agents, or whether the loan is likely to be approved or rejected.
Never include personal data such as PAN, Aadhaar or account numbers. Return only the message text.`;

const FORBIDDEN = /\d{3}|score|ratio|risk|band|approv|reject|internal|agent/i;
const sentenceCount = (t: string) => t.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim()).length;

export function fallbackMessage(missingDocuments: string[]): string {
  if (!missingDocuments.length) return 'Your application is now with our credit team for review. We will update you here once a decision is made.';
  return `Please upload a valid ${joinLabels(missingDocuments.map((l) => l[0].toLowerCase() + l.slice(1)))} to continue your application.`;
}

export async function runCustomerCommunicationAgent(ctx: AgentContext, missingDocuments: string[]):
  Promise<{ customerMessage: string; check: AgentCheckInternal | null }> {
  const { audit, customer } = ctx;
  let check: AgentCheckInternal | null = null;
  if (ctx.options.demoPermissionViolation) { // G-4 demo hook: deliberately out-of-permission call
    try {
      await invokeTool('CustomerCommunicationAgent', 'get_credit_score', { customerId: customer.customerId }, audit);
    } catch (err) {
      if (!(err instanceof AgentPermissionDeniedError)) throw err;
      check = { agent: 'CustomerCommunicationAgent', result: 'EXCEPTION', detail: 'Refused: CustomerCommunicationAgent is not permitted to call get_credit_score' };
    }
  }
  const facts = { missingDocuments, nextStep: missingDocuments.length ? 'UPLOAD_DOCUMENTS' : 'UNDER_REVIEW' };
  await audit.record({ agent: 'CustomerCommunicationAgent', eventType: 'LLM_CALL', input: facts });
  let text = '';
  try { text = await plainText({ system: SYSTEM, prompt: JSON.stringify(facts) }); } catch { /* fallback below */ }
  const usedFallback = !text || text.length > 300 || sentenceCount(text) > 2 || FORBIDDEN.test(text);
  if (usedFallback) text = fallbackMessage(missingDocuments);
  await audit.record({ agent: 'CustomerCommunicationAgent', eventType: 'LLM_RESULT', output: { text, usedFallback } });
  return { customerMessage: text, check };
}
