import { readFileSync } from 'node:fs';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app';
import { signToken, type AuthUser } from '../../common/auth';
import { AppError } from '../../common/errors';
import { prisma } from '../../common/prisma';
import { structured } from '../config/llm';
import { resetStub } from '../stub/core';
import { embedDocuments } from '../rag/embeddings';
import { ingestFile, KbMetaSchema } from '../rag/ingest';
import { AdvisorResponseSchema } from '../advisor/schemas';
import { AgentRecommendationSchema } from '../agents/schemas';
import { SAFE_ANSWER } from '../rag/schemas';

// Real HTTP/auth, parsers, pgvector, policy lifecycle, agents and audit persistence; only external AI is replaced.
vi.mock('../coreBridge', async () => await import('../stub/core'));
vi.mock('../rag/embeddings', () => ({
  embedDocuments: vi.fn(async (texts: string[]) => texts.map(() => Array(768).fill(1 / Math.sqrt(768)))),
  embedQuery: vi.fn(async () => Array(768).fill(1 / Math.sqrt(768))),
}));
vi.mock('../config/llm', () => ({ structured: vi.fn(), plainText: vi.fn().mockRejectedValue(new Error('Test provider offline')) }));

const app = createApp();
const customer: AuthUser = { username: 'priya.sharma', role: 'CUSTOMER', customerId: 'CUST-1001' };
const officer: AuthUser = { username: 'officer.kumar', role: 'LOAN_OFFICER', customerId: null };
const admin: AuthUser = { username: 'admin.rao', role: 'POLICY_ADMIN', customerId: null };
const auth = (u: AuthUser) => `Bearer ${signToken(u)}`;
const KEY = 'TEST-HTTP-VEHICLE';
const ids: string[] = [];
const trails: string[] = [];
const base = '/api/admin/policies';
const content = readFileSync(new URL('../../../../db/knowledge/demo/vehicle-tnc-v2026.4.md', import.meta.url));
const upload = (version = '2026.4', effectiveDate = '2026-10-23') => request(app).post(base).set('authorization', auth(admin))
  .field('documentKey', KEY).field('title', 'Vehicle Loan Terms and Conditions').field('version', version)
  .field('effectiveDate', effectiveDate).field('loanType', 'VEHICLE').field('documentType', 'TERMS_AND_CONDITIONS')
  .field('audience', 'CUSTOMER').field('customerSegment', 'ALL').field('changeNote', 'Foreclosure lock-in reduced to 3 EMIs')
  .attach('file', content, 'vehicle.md');
const cleanup = async () => {
  await prisma.kbDocument.deleteMany({ where: { id: { in: ids } } });
  await prisma.kbDocument.deleteMany({ where: { documentKey: KEY } });
  await prisma.agentRun.deleteMany({ where: { OR: [{ applicationId: KEY }, { auditTrailId: { in: trails } }] } });
};

describe.skipIf(!process.env.DATABASE_URL)('S2 HTTP acceptance (Postgres, external AI mocked)', () => {
  beforeAll(async () => {
    await cleanup();
    const meta = KbMetaSchema.parse({ documentKey: KEY, title: 'Vehicle Loan Terms and Conditions', version: '2026.3',
      effectiveDate: '2026-07-01', loanType: 'VEHICLE', documentType: 'TERMS_AND_CONDITIONS', audience: 'CUSTOMER', customerSegment: 'ALL' });
    const d = await ingestFile({ fileName: 'vehicle.md', buffer: readFileSync(new URL('../../../../db/knowledge/vehicle-loan-terms-v2026.3.md', import.meta.url)),
      meta, status: 'PUBLISHED', createdBy: 'test', changeNote: 'Acceptance baseline' });
    ids.push(d.documentId);
  });
  beforeEach(() => { resetStub(); vi.mocked(structured).mockReset(); });
  afterAll(cleanup);

  it('enforces authentication and the role matrix before accessing services', async () => {
    for (const path of ['/api/knowledge/documents', base, '/api/audit/AUD-2026-00001']) {
      expect((await request(app).get(path)).status).toBe(401);
    }
    for (const u of [customer, officer, { ...officer, role: 'CREDIT_ANALYST' as const }]) {
      for (const [method, path] of [['get', base], ['post', base], ['get', `${base}/${KEY}/versions`],
        ['get', `${base}/versions/00000000-0000-4000-8000-000000000000/preview`],
        ['post', `${base}/versions/00000000-0000-4000-8000-000000000000/test-ask`],
        ['post', `${base}/versions/00000000-0000-4000-8000-000000000000/publish`],
        ['post', `${base}/versions/00000000-0000-4000-8000-000000000000/retire`]] as const) {
        expect((await request(app)[method](path).set('authorization', auth(u))).status).toBe(403);
      }
    }
    expect((await request(app).get('/api/knowledge/documents').set('authorization', auth(customer))).status).toBe(403);
    expect((await request(app).post('/api/knowledge/documents').set('authorization', auth(officer))).status).toBe(404);
    for (const u of [customer, admin]) expect((await request(app).post('/api/workflow/applications/LA-2026-00418/run')
      .set('authorization', auth(u))).status).toBe(403);
    expect((await request(app).get('/api/audit/AUD-2026-00001').set('authorization', auth(admin))).status).toBe(403);
  });

  it('validates bodies, params, calendar dates and malformed uploads with the shared error envelope', async () => {
    const r = await request(app).post('/api/policy/ask').set('authorization', auth(customer)).send({ question: 'x' });
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ status: 400, code: 'VALIDATION_FAILED', path: '/api/policy/ask', details: expect.any(Array), timestamp: expect.any(String) });
    expect((await request(app).get(`${base}/versions/not-a-uuid/preview`).set('authorization', auth(admin))).status).toBe(400);
    expect((await upload('bad-date', '2026-02-30')).status).toBe(400);
    expect((await request(app).post(base).set('authorization', auth(admin)).attach('file', Buffer.from('x'), 'bad.exe')).status).toBe(400);
    expect((await request(app).post(base).set('authorization', auth(admin)).attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), 'huge.md')).status).toBe(400);
  });

  it('runs draft → preview → test-ask → publish → retire/rollback → scheduled, with persisted policy audit', async () => {
    const initial = await request(app).get(base).set('authorization', auth(admin));
    expect(initial.body.find((d: { documentKey: string }) => d.documentKey === KEY)).toMatchObject({ activeVersion: '2026.3', totalVersions: 1 });
    const d = await upload();
    expect(d.status).toBe(201);
    expect(d.body).toMatchObject({ status: 'DRAFT', servingState: 'DRAFT' });
    const id = d.body.documentId as string;
    expect((await upload()).status).toBe(409);
    const current = async () => (await request(app).get('/api/knowledge/documents').set('authorization', auth(officer)))
      .body.find((v: { documentKey: string }) => v.documentKey === KEY).version;
    expect(await current()).toBe('2026.3');
    const preview = await request(app).get(`${base}/versions/${id}/preview`).set('authorization', auth(admin));
    expect(preview.body.some((c: { section: string }) => c.section === 'Foreclosure and Part-Prepayment')).toBe(true);
    vi.mocked(structured).mockImplementation(async ({ prompt }) => ({ answer: 'Foreclosure is allowed after 3 EMIs, with a 1% charge on the outstanding principal.',
      confidence: 'HIGH', usedChunkIds: [prompt.match(/\[(C\d+)\] \(Vehicle Loan Terms and Conditions › Foreclosure and Part-Prepayment/)?.[1] ?? 'C1'], followUpRequired: false }));
    const answer = await request(app).post(`${base}/versions/${id}/test-ask`).set('authorization', auth(admin))
      .send({ question: 'What is the foreclosure policy?' });
    expect(answer.status).toBe(200);
    expect(answer.body.sources.every((s: { version: string }) => s.version === '2026.4')).toBe(true);
    const pub = await request(app).post(`${base}/versions/${id}/publish`).set('authorization', auth(admin));
    expect(pub.body).toMatchObject({ status: 'PUBLISHED', servingState: 'ACTIVE', publishedBy: 'admin.rao' });
    expect(await current()).toBe('2026.4');
    expect((await request(app).post(`${base}/versions/${id}/publish`).set('authorization', auth(admin))).status).toBe(409);
    expect((await request(app).post(`${base}/versions/${id}/retire`).set('authorization', auth(admin)).send({ reason: '' })).status).toBe(400);
    const retired = await request(app).post(`${base}/versions/${id}/retire`).set('authorization', auth(admin)).send({ reason: 'Published before legal sign-off' });
    expect(retired.body).toMatchObject({ status: 'RETIRED', servingState: 'RETIRED' });
    expect(await current()).toBe('2026.3');
    const future = await upload('2026.5', '9999-01-01');
    expect(future.status).toBe(201);
    const scheduled = await request(app).post(`${base}/versions/${future.body.documentId}/publish`).set('authorization', auth(admin));
    expect(scheduled.body.servingState).toBe('SCHEDULED');
    expect(await current()).toBe('2026.3');
    const history = await request(app).get(`${base}/${KEY}/versions`).set('authorization', auth(admin));
    expect(history.body.map((v: { servingState: string }) => v.servingState)).toEqual(['SCHEDULED', 'RETIRED', 'ACTIVE']);
    const run = await prisma.agentRun.findFirstOrThrow({ where: { applicationId: KEY } });
    const trail = await request(app).get(`/api/audit/${run.auditTrailId}`).set('authorization', auth(admin));
    expect(trail.body.events.map((e: { eventType: string }) => e.eventType)).toEqual(['POLICY_DRAFTED', 'POLICY_PUBLISHED', 'POLICY_RETIRED', 'POLICY_DRAFTED', 'POLICY_PUBLISHED']);
  });

  it('returns the advisor brief shape and clarification through HTTP', async () => {
    vi.mocked(structured).mockResolvedValueOnce({ interpretedRequirement: 'Used car loan of 5 lakh with EMI below 12,000', loanAmount: 500000,
      monthlyIncome: 60000, annualIncome: null, maxPreferredEmi: 12000, purpose: 'used car', loanTypeGuess: 'VEHICLE', clarifyingQuestion: null })
      .mockRejectedValueOnce(new Error('Reason provider offline'));
    const r = await request(app).post('/api/advisor/chat').set('authorization', auth(customer))
      .send({ message: 'I need ₹5 lakh for a used car. I earn ₹60,000 per month and want an EMI below ₹12,000.' });
    expect(r.status).toBe(200);
    expect(AdvisorResponseSchema.parse(r.body).recommendations[0]).toMatchObject({ productId: 'VL-204', tenureMonths: 60, estimatedEmi: 10871, eligibilityIndicator: 'LIKELY_ELIGIBLE' });
    vi.mocked(structured).mockResolvedValueOnce({ interpretedRequirement: 'Loan request', loanAmount: null, monthlyIncome: null, annualIncome: null,
      maxPreferredEmi: null, purpose: null, loanTypeGuess: null, clarifyingQuestion: null });
    const clarify = await request(app).post('/api/advisor/chat').set('authorization', auth(customer)).send({ message: 'I want a loan' });
    expect(clarify.body.recommendations).toEqual([]);
    expect(clarify.body.clarifyingQuestion).toEqual(expect.any(String));
  });

  it('runs the missing-address workflow, reads its persisted audit and latest recommendation, refuses repeats', async () => {
    vi.mocked(structured).mockResolvedValue({ answer: 'NOT_FOUND', confidence: 'LOW', usedChunkIds: [], followUpRequired: true });
    const path = '/api/workflow/applications/LA-2026-00418';
    const r = await request(app).post(`${path}/run`).set('authorization', auth(officer));
    if (r.body.auditTrailId) trails.push(r.body.auditTrailId);
    expect(r.status).toBe(200);
    const result = AgentRecommendationSchema.parse(r.body);
    expect(result).toMatchObject({ recommendation: 'REQUEST_ADDITIONAL_DOCUMENTS', riskBand: 'MEDIUM', missingDocuments: ['Address proof'], requiresHumanApproval: true });
    expect(result.checks[1].detail).toBe('Obligation ratio is 35% (limit 50%); credit score band is 720-760');
    const trail = await request(app).get(`/api/audit/${result.auditTrailId}`).set('authorization', auth(officer));
    const types = trail.body.events.map((e: { eventType: string }) => e.eventType) as string[];
    expect(types.filter((t) => t === 'TOOL_CALL')).toHaveLength(7);
    expect(types.filter((t) => t === 'TOOL_RESULT')).toHaveLength(7);
    expect(types.filter((t) => t === 'HUMAN_REQUIRED')).toHaveLength(1);
    expect(JSON.stringify(trail.body)).toContain('XXXXX1234X');
    expect(JSON.stringify(trail.body)).not.toContain('ABCPS1234K');
    expect((await request(app).get(`${path}/recommendation`).set('authorization', auth(officer))).body).toEqual(result);
    expect((await request(app).post(`${path}/run`).set('authorization', auth(officer))).status).toBe(409);
    resetStub();
    const denied = await request(app).post(`${path}/run?demoPermissionViolation=true`).set('authorization', auth(officer));
    if (denied.body.auditTrailId) trails.push(denied.body.auditTrailId);
    expect(denied.body.checks[3]).toMatchObject({ agent: 'CustomerCommunicationAgent', result: 'EXCEPTION' });
    const refusal = await request(app).get(`/api/audit/${denied.body.auditTrailId}`).set('authorization', auth(officer));
    expect(refusal.body.events.filter((e: { eventType: string }) => e.eventType === 'PERMISSION_DENIED')).toHaveLength(1);
  });

  it('propagates AI failures as 503 and never supplies a general-knowledge answer', async () => {
    vi.mocked(structured).mockRejectedValue(new AppError(503, 'AI_UNAVAILABLE', 'The AI service is unavailable. Please try again.'));
    const r = await request(app).post('/api/policy/ask').set('authorization', auth(customer)).send({ question: 'What is the foreclosure policy?' });
    expect(r.status).toBe(503);
    expect(r.body.code).toBe('AI_UNAVAILABLE');
    vi.mocked(structured).mockResolvedValue({ answer: 'NOT_FOUND', confidence: 'LOW', usedChunkIds: [], followUpRequired: true });
    const safe = await request(app).post('/api/policy/ask').set('authorization', auth(customer)).send({ question: 'What is the capital of France?' });
    expect(safe.body).toEqual(SAFE_ANSWER);
    vi.mocked(embedDocuments).mockRejectedValueOnce(new AppError(503, 'AI_UNAVAILABLE', 'The AI service is unavailable. Please try again.'));
    expect((await upload('unavailable')).status).toBe(503);
  });
});
