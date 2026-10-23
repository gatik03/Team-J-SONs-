import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentName, AuditInput } from '../agents/types';

vi.mock('../coreBridge', async () => await import('../stub/core'));
vi.mock('../rag/policyAssistant', () => ({ askPolicy: vi.fn(async () => ({ answer: 'x', confidence: 'HIGH', sources: [], followUpRequired: false })) }));

import { getApplication, resetStub } from '../stub/core';
import { AgentPermissionDeniedError, guardedTools, invokeTool, isAllowed, TOOL_PERMISSIONS } from './permissionGuard';
import type { ToolName } from './mockTools';

const events: AuditInput[] = [];
const audit = { auditTrailId: 'AUD-2026-00000', record: async (e: AuditInput) => { events.push(e); } };
const types = () => events.map((e) => e.eventType);

describe('permissionGuard', () => {
  beforeEach(() => { events.length = 0; resetStub(); });

  it('isAllowed matches the Integration_Contracts §7 table', () => {
    const expected: Record<ToolName, AgentName[]> = {
      get_credit_score: ['CreditAssessmentAgent'], verify_income: ['DocumentVerificationAgent', 'CreditAssessmentAgent'],
      get_kyc_status: ['ComplianceAgent'], update_application: ['OrchestratorAgent'], search_policy: ['ComplianceAgent'],
    };
    const agents: AgentName[] = ['DocumentVerificationAgent', 'CreditAssessmentAgent', 'ComplianceAgent', 'CustomerCommunicationAgent', 'OrchestratorAgent'];
    for (const tool of Object.keys(expected) as ToolName[]) {
      for (const agent of agents) expect(isAllowed(agent, tool), `${agent} ${tool}`).toBe(expected[tool].includes(agent));
    }
    expect(Object.keys(TOOL_PERMISSIONS).sort()).toEqual(Object.keys(expected).sort());
  });

  it('refuses an out-of-permission call and audits PERMISSION_DENIED without TOOL_CALL', async () => {
    await expect(invokeTool('CustomerCommunicationAgent', 'get_credit_score', { customerId: 'CUST-1001' }, audit)).rejects.toBeInstanceOf(AgentPermissionDeniedError);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ eventType: 'PERMISSION_DENIED', toolName: 'get_credit_score' });
  });

  it('update_application cannot move an application to a decision state (G-2)', async () => {
    await expect(invokeTool('OrchestratorAgent', 'update_application', { applicationId: 'LA-2026-00418', status: 'APPROVED', note: 'x' }, audit))
      .rejects.toBeInstanceOf(AgentPermissionDeniedError);
    expect(types()).toContain('PERMISSION_DENIED');
    expect((await getApplication('LA-2026-00418')).status).toBe('SUBMITTED');
  });

  it('allowed call returns the tool output and records TOOL_CALL then TOOL_RESULT', async () => {
    await expect(invokeTool('CreditAssessmentAgent', 'get_credit_score', { customerId: 'CUST-1001' }, audit)).resolves.toEqual({ score: 742, band: '720-760' });
    expect(types()).toEqual(['TOOL_CALL', 'TOOL_RESULT']);
  });

  it('guardedTools exposes only the allowed tools', () => {
    expect(Object.keys(guardedTools('ComplianceAgent', audit)).sort()).toEqual(['get_kyc_status', 'search_policy']);
    expect(guardedTools('CustomerCommunicationAgent', audit)).toEqual({});
  });

  it('guardedTools execute goes through the guard', async () => {
    const out = await guardedTools('CreditAssessmentAgent', audit).get_credit_score.execute!({ customerId: 'CUST-1001' }, { toolCallId: 't1', messages: [] });
    expect(out).toMatchObject({ score: 742 });
    expect(types()).toContain('TOOL_CALL');
  });
});
