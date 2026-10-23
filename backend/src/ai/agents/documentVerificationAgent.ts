import { invokeTool } from '../tools/permissionGuard';
import type { AgentCheckInternal, AgentContext } from './types';

const REQUIRED = [['IDENTITY', 'Identity proof'], ['ADDRESS', 'Address proof'], ['INCOME', 'Income proof']] as const;

export function joinLabels(labels: string[]): string {
  return labels.length <= 1 ? (labels[0] ?? '') : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}
export const missingSentence = (labels: string[]) => `${joinLabels(labels)} ${labels.length === 1 ? 'is' : 'are'} missing`;

export async function runDocumentVerificationAgent(ctx: AgentContext): Promise<AgentCheckInternal> {
  const { application, customer, documents, audit } = ctx;
  const missing = REQUIRED.filter(([type]) => !documents.some((d) => d.documentType === type)).map(([, label]) => label);
  const inc = await invokeTool<{ verified: boolean; verifiedIncome: number; nameMatch: boolean; addressMatch: boolean }>(
    'DocumentVerificationAgent', 'verify_income', { customerId: customer.customerId, declaredIncome: application.monthlyIncome }, audit);
  const mismatches: string[] = [];
  if (!inc.nameMatch) mismatches.push('Name does not match bank records');
  if (!inc.addressMatch) mismatches.push('Address does not match bank records');
  if (!inc.verified) mismatches.push(`Declared income ₹${application.monthlyIncome.toLocaleString('en-IN')} does not match verified income ₹${inc.verifiedIncome.toLocaleString('en-IN')}`);
  const facts = { missingDocuments: missing };
  if (mismatches.length) {
    return { agent: 'DocumentVerificationAgent', result: 'FAIL', detail: [...mismatches, ...(missing.length ? [missingSentence(missing)] : [])].join('; '), facts };
  }
  if (missing.length) return { agent: 'DocumentVerificationAgent', result: 'INCOMPLETE', detail: missingSentence(missing), facts };
  return { agent: 'DocumentVerificationAgent', result: 'PASS', detail: 'All required documents are present and match bank records', facts };
}
