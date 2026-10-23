import { invokeTool } from '../tools/permissionGuard';
import type { AgentCheckInternal, AgentContext } from './types';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export async function runComplianceAgent(ctx: AgentContext): Promise<AgentCheckInternal> {
  const { application: a, customer, product: p, audit } = ctx;
  const kyc = await invokeTool<{ status: string }>('ComplianceAgent', 'get_kyc_status', { customerId: customer.customerId }, audit);
  const exceptions: string[] = [];
  if (a.requestedAmount < p.minAmount || a.requestedAmount > p.maxAmount) {
    exceptions.push(`Requested amount ${inr(a.requestedAmount)} is outside the product range ${inr(p.minAmount)}–${inr(p.maxAmount)}`);
  }
  if (a.tenureMonths < p.minTenureMonths || a.tenureMonths > p.maxTenureMonths) {
    exceptions.push(`Tenure ${a.tenureMonths} months is outside the product range ${p.minTenureMonths}–${p.maxTenureMonths} months`);
  }
  if (!p.eligibilityCriteria.allowedSegments.includes(customer.segment)) exceptions.push(`Customer segment ${customer.segment} is not eligible for ${p.productId}`);

  let policyRef: string | null = null;
  try {
    const ans = await invokeTool<{ sources: { document: string; section: string; version: string }[] }>('ComplianceAgent', 'search_policy',
      { question: 'What is the policy for loan applications with policy exceptions?', filters: { documentType: 'CREDIT_POLICY' } }, audit);
    const s = ans.sources[0];
    policyRef = s ? `${s.document} › ${s.section} (v${s.version})` : null;
  } catch { /* AI/RAG unavailable: the guard already audited the failed call */ }

  const facts = { exceptions };
  if (kyc.status !== 'VERIFIED' || exceptions.length) {
    const parts = [...(kyc.status !== 'VERIFIED' ? [`KYC status is ${kyc.status}`] : []), ...exceptions];
    return { agent: 'ComplianceAgent', result: 'EXCEPTION', detail: parts.join('; ') + (policyRef ? ` — see ${policyRef}` : ''), facts };
  }
  return { agent: 'ComplianceAgent', result: 'PASS', detail: 'KYC status verified', facts };
}
