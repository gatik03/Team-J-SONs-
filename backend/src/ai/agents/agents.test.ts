import { describe, expect, it, vi } from 'vitest';
import { getApplication, getCustomer, getProduct } from '../stub/core';
import { invokeTool } from '../tools/permissionGuard';
import { runDocumentVerificationAgent } from './documentVerificationAgent';
import { runCreditAssessmentAgent } from './creditAssessmentAgent';
import { runComplianceAgent } from './complianceAgent';
import type { AgentContext } from './types';

vi.mock('../tools/permissionGuard', () => ({ invokeTool: vi.fn() }));

async function context(): Promise<AgentContext> {
  const { documents, ...application } = await getApplication('LA-2026-00418');
  return { application, documents, customer: await getCustomer(application.customerId), product: (await getProduct(application.productId))!,
    audit: { auditTrailId: 'AUD-2026-00000', record: async () => {} }, options: { demoPermissionViolation: false } };
}

describe('agent exception rules', () => {
  it('flags name, address and declared-income mismatches alongside missing documents', async () => {
    vi.mocked(invokeTool).mockResolvedValueOnce({ verified: false, nameMatch: false, addressMatch: false, verifiedIncome: 30000 });
    const r = await runDocumentVerificationAgent(await context());
    expect(r.result).toBe('FAIL');
    for (const text of ['Name does not match', 'Address does not match', 'Declared income', 'Address proof is missing']) expect(r.detail).toContain(text);
    expect(r.facts?.missingDocuments).toEqual(['Address proof']);
  });

  it('passes complete documents whose verified details match', async () => {
    const ctx = await context();
    ctx.documents.push({ ...ctx.documents[0], documentType: 'ADDRESS' });
    vi.mocked(invokeTool).mockResolvedValueOnce({ verified: true, nameMatch: true, addressMatch: true, verifiedIncome: 60000 });
    expect(await runDocumentVerificationAgent(ctx)).toMatchObject({ result: 'PASS', facts: { missingDocuments: [] } });
  });

  it('fails credit rules for insufficient income, low score and excessive obligations', async () => {
    vi.mocked(invokeTool).mockResolvedValueOnce({ score: 640, band: '640-680' }).mockResolvedValueOnce({ verifiedIncome: 10000 });
    const r = await runCreditAssessmentAgent(await context());
    expect(r.result).toBe('FAIL');
    for (const text of ['credit score below', 'income below', 'obligation ratio above']) expect(r.detail).toContain(text);
    expect(r.facts?.ratioPct).toBeGreaterThan(50);
  });

  it('refers KYC, amount, tenure and segment exceptions to a human even when RAG is unavailable', async () => {
    const ctx = await context();
    ctx.application.requestedAmount = ctx.product.maxAmount + 1;
    ctx.application.tenureMonths = ctx.product.maxTenureMonths + 1;
    ctx.customer.segment = 'STUDENT';
    vi.mocked(invokeTool).mockResolvedValueOnce({ status: 'PENDING' }).mockRejectedValueOnce(new Error('RAG unavailable'));
    const r = await runComplianceAgent(ctx);
    expect(r.result).toBe('EXCEPTION');
    expect(r.detail).toContain('KYC status is PENDING');
    expect(r.facts?.exceptions).toHaveLength(3);
  });
});
