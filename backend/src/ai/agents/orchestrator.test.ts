import { beforeEach, describe, expect, it, vi } from 'vitest';

const { events } = vi.hoisted(() => ({ events: [] as any[] }));
vi.mock('../coreBridge', async () => await import('../stub/core'));
vi.mock('../config/llm', () => ({ structured: vi.fn().mockRejectedValue(new Error('LLM down')), plainText: vi.fn().mockRejectedValue(new Error('LLM down')) }));
vi.mock('../rag/policyAssistant', () => ({ askPolicy: vi.fn().mockResolvedValue({ answer: 'Only a credit analyst can approve an exception.', confidence: 'HIGH',
  sources: [{ document: 'Credit Policy and Eligibility Criteria', section: 'Policy Exceptions', version: '2026.2', effectiveDate: '2026-04-01' }], followUpRequired: false }) }));
vi.mock('../audit/auditService', () => ({
  createTrail: vi.fn(async () => ({ auditTrailId: 'AUD-2026-77301', record: async (e: any) => { events.push(e); } })),
  completeTrail: vi.fn(async () => {}),
}));

import { getApplication, getCustomer, resetStub } from '../stub/core';
import { runWorkflow } from './orchestrator';
import { toAgentCustomer } from './types';

const officer = { username: 'officer.kumar', role: 'LOAN_OFFICER' as const, customerId: null };
const count = (t: string) => events.filter((e) => e.eventType === t).length;

describe('runWorkflow', () => {
  beforeEach(() => { events.length = 0; resetStub(); });

  it('LA-2026-00418 → REQUEST_ADDITIONAL_DOCUMENTS with the brief checks', async () => {
    const r = await runWorkflow('LA-2026-00418', officer);
    expect(r.recommendation).toBe('REQUEST_ADDITIONAL_DOCUMENTS');
    expect(r.riskBand).toBe('MEDIUM');
    expect(r.requiresHumanApproval).toBe(true);
    expect(r.auditTrailId).toMatch(/^AUD-/);
    expect(r.checks).toEqual([
      { agent: 'DocumentVerificationAgent', result: 'INCOMPLETE', detail: 'Address proof is missing' },
      { agent: 'CreditAssessmentAgent', result: 'PASS', detail: 'Obligation ratio is 35% (limit 50%); credit score band is 720-760' },
      { agent: 'ComplianceAgent', result: 'PASS', detail: 'KYC status verified' },
    ]);
    expect(r.missingDocuments).toEqual(['Address proof']);
    expect(r.customerMessage).toBe('Please upload a valid address proof to continue your application.');
    expect(count('HUMAN_REQUIRED')).toBe(1);
    expect(count('TOOL_CALL')).toBe(7);
    expect(count('PERMISSION_DENIED')).toBe(0);
    expect((await getApplication('LA-2026-00418')).status).toBe('UNDER_REVIEW');
  });

  it('demoPermissionViolation adds a refused 4th check and one PERMISSION_DENIED', async () => {
    const r = await runWorkflow('LA-2026-00418', officer, { demoPermissionViolation: true });
    expect(r.checks).toHaveLength(4);
    expect(r.checks[3]).toEqual({ agent: 'CustomerCommunicationAgent', result: 'EXCEPTION', detail: 'Refused: CustomerCommunicationAgent is not permitted to call get_credit_score' });
    expect(count('PERMISSION_DENIED')).toBe(1);
    expect(r.recommendation).toBe('REQUEST_ADDITIONAL_DOCUMENTS');
  });

  it('a second run on the same application is 409 INVALID_STATE', async () => {
    await runWorkflow('LA-2026-00418', officer);
    await expect(runWorkflow('LA-2026-00418', officer)).rejects.toMatchObject({ status: 409, code: 'INVALID_STATE' });
  });

  it('toAgentCustomer drops protected attributes (G-1)', async () => {
    const priya = await getCustomer('CUST-1001');
    const c = toAgentCustomer({ ...priya, gender: 'F', religion: 'X', maritalStatus: 'single' }) as unknown as Record<string, unknown>;
    for (const k of ['gender', 'religion', 'maritalStatus']) expect(c).not.toHaveProperty(k);
    expect(c).toEqual(priya);
  });
});
