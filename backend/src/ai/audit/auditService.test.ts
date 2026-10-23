import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../common/prisma';
import type { AgentRecommendation } from '../agents/schemas';
import { completeTrail, createTrail, getAuditTrail, getLatestRecommendation, recordPolicyEvent } from './auditService';

const APP = 'LA-1999-00001';
const KEY = 'TEST-AUDIT-KEY';
const clean = () => prisma.agentRun.deleteMany({ where: { applicationId: { in: [APP, KEY] } } });

describe.skipIf(!process.env.DATABASE_URL)('auditService', () => {
  beforeEach(clean);
  afterAll(async () => { await clean(); await prisma.$disconnect(); });

  it('writes a masked, ordered trail and stores the recommendation', async () => {
    const w = await createTrail(APP);
    expect(w.auditTrailId).toMatch(/^AUD-\d{4}-\d{5}$/);
    await w.record({ agent: 'CreditAssessmentAgent', eventType: 'TOOL_CALL', toolName: 'verify_income', input: { customerId: 'CUST-1001' } });
    await w.record({ agent: 'CreditAssessmentAgent', eventType: 'TOOL_RESULT', toolName: 'verify_income', output: { panOnRecord: 'ABCPS1234K' }, durationMs: 5 });
    const trail = await getAuditTrail(w.auditTrailId);
    expect(trail.events.map((e) => [e.sequence, e.eventType])).toEqual([[1, 'TOOL_CALL'], [2, 'TOOL_RESULT']]);
    expect(JSON.stringify(trail)).toContain('XXXXX1234X');
    expect(JSON.stringify(trail)).not.toContain('ABCPS1234K');
    expect(trail.completedAt).toBeNull();

    await expect(getLatestRecommendation(APP)).rejects.toMatchObject({ status: 404 });
    const rec: AgentRecommendation = { applicationId: APP, recommendation: 'REFER_TO_HUMAN', riskBand: 'MEDIUM', checks: [], missingDocuments: [],
      customerMessage: 'x', requiresHumanApproval: true, auditTrailId: w.auditTrailId };
    await completeTrail(w.auditTrailId, rec);
    expect(await getLatestRecommendation(APP)).toEqual(rec);
    expect((await getAuditTrail(w.auditTrailId)).completedAt).not.toBeNull();
  });

  it('unknown trail → 404', async () => {
    await expect(getAuditTrail('AUD-1999-99999')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('recordPolicyEvent keeps one AUD-POL trail per documentKey', async () => {
    const a = await recordPolicyEvent({ actor: 'admin.rao', eventType: 'POLICY_DRAFTED', documentKey: KEY, version: '1.0', changeNote: 'Initial', status: 'DRAFT' });
    const b = await recordPolicyEvent({ actor: 'admin.rao', eventType: 'POLICY_RETIRED', documentKey: KEY, version: '1.0', reason: 'Wrong charge', status: 'RETIRED' });
    expect(a).toMatch(/^AUD-POL-\d{5}$/);
    expect(b).toBe(a);
    const trail = await getAuditTrail(a);
    expect(trail.events.map((e) => [e.sequence, e.agent, e.eventType])).toEqual([[1, 'admin.rao', 'POLICY_DRAFTED'], [2, 'admin.rao', 'POLICY_RETIRED']]);
    expect(trail.events[1].input).toEqual({ documentKey: KEY, version: '1.0', reason: 'Wrong charge' });
  });
});
