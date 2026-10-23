import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../common/prisma';
import { recordPolicyEvent } from '../audit/auditService';
import { embedDocuments } from './embeddings';
import type { KbMeta } from './ingest';
import { listLibrary, listVersions, publishVersion, retireVersion, uploadDraft } from './policyAdminService';

vi.mock('./embeddings', () => ({ embedDocuments: vi.fn(async (t: string[]) => t.map(() => Array(768).fill(1 / Math.sqrt(768)))), embedQuery: vi.fn() }));
vi.mock('../audit/auditService', () => ({ recordPolicyEvent: vi.fn(async () => 'AUD-POL-00001') }));

const KEY = 'TEST-ADMIN';
const meta = (version: string, effectiveDate = '2026-01-01'): KbMeta => ({ documentKey: KEY, title: 'Test Admin Policy', version, effectiveDate,
  loanType: 'ALL', documentType: 'TERMS_AND_CONDITIONS', audience: 'CUSTOMER', customerSegment: 'ALL' });
const draft = (version = '1.0', effectiveDate?: string) => uploadDraft({ buffer: Buffer.from('# T\n## Fees\nThe fee is ₹100.\n'), fileName: 'p.md',
  meta: meta(version, effectiveDate), changeNote: 'Initial draft', actor: 'admin.rao' });
const cleanup = () => prisma.kbDocument.deleteMany({ where: { documentKey: KEY } });

describe.skipIf(!process.env.DATABASE_URL)('policyAdminService (Postgres, no network)', () => {
  beforeEach(async () => { await cleanup(); vi.clearAllMocks(); });
  afterAll(cleanup);

  it('1. publishes only from DRAFT', async () => {
    const d = await draft();
    expect(d).toMatchObject({ status: 'DRAFT', servingState: 'DRAFT', createdBy: 'admin.rao', publishedAt: null });
    const p = await publishVersion(d.documentId, 'admin.rao', '2026-10-23');
    expect(p).toMatchObject({ status: 'PUBLISHED', publishedBy: 'admin.rao', servingState: 'ACTIVE' });
    expect(p.publishedAt).toEqual(expect.any(String));
    await expect(publishVersion(d.documentId, 'admin.rao')).rejects.toMatchObject({ status: 409, code: 'INVALID_STATE' });
    await retireVersion(d.documentId, 'Wrong charge published', 'admin.rao');
    await expect(publishVersion(d.documentId, 'admin.rao')).rejects.toMatchObject({ status: 409, code: 'INVALID_STATE' });
  });

  it('puts the latest publication first regardless of title and effective date', async () => {
    const d = await draft('1.0', '2020-01-01');
    await publishVersion(d.documentId, 'admin.rao');
    await prisma.kbDocument.update({ where: { id: d.documentId }, data: { title: 'ZZZ Latest Publication', publishedAt: new Date('2099-01-01') } });
    const library = await listLibrary('2026-10-23');
    expect(library[0].documentKey).toBe(KEY);
    expect(library[0].activeEffectiveDate).toBe('2020-01-01');
  });

  it('2. retire requires a reason and a PUBLISHED row', async () => {
    const d = await draft();
    await expect(retireVersion(d.documentId, 'Not published yet', 'admin.rao')).rejects.toMatchObject({ status: 409, code: 'INVALID_STATE' });
    await publishVersion(d.documentId, 'admin.rao');
    for (const bad of ['', 'abc']) await expect(retireVersion(d.documentId, bad, 'admin.rao')).rejects.toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
    expect((await prisma.kbDocument.findUniqueOrThrow({ where: { id: d.documentId } })).status).toBe('PUBLISHED');
    const r = await retireVersion(d.documentId, 'Wrong charge published', 'admin.rao');
    expect(r).toMatchObject({ status: 'RETIRED', servingState: 'RETIRED', retiredReason: 'Wrong charge published' });
  });

  it('3. duplicate version → 409 before any embedding call', async () => {
    await draft();
    await expect(draft()).rejects.toMatchObject({ status: 409, code: 'INVALID_STATE' });
    expect(embedDocuments).toHaveBeenCalledTimes(1);
    expect(await prisma.kbDocument.count({ where: { documentKey: KEY } })).toBe(1);
  });

  it('4. writes POLICY_* audit events in order', async () => {
    const d = await draft();
    await publishVersion(d.documentId, 'admin.rao');
    await retireVersion(d.documentId, 'Wrong charge published', 'admin.rao');
    const calls = vi.mocked(recordPolicyEvent).mock.calls.map(([e]) => e);
    const common = { actor: 'admin.rao', documentKey: KEY, version: '1.0' };
    expect(calls).toEqual([
      expect.objectContaining({ ...common, eventType: 'POLICY_DRAFTED', changeNote: 'Initial draft', status: 'DRAFT' }),
      expect.objectContaining({ ...common, eventType: 'POLICY_PUBLISHED', changeNote: 'Initial draft', status: 'PUBLISHED' }),
      expect.objectContaining({ ...common, eventType: 'POLICY_RETIRED', reason: 'Wrong charge published', status: 'RETIRED' }),
    ]);
  });

  it('5. servingState is computed at read time', async () => {
    await publishVersion((await draft('1.0', '2026-01-01')).documentId, 'admin.rao');
    await publishVersion((await draft('2.0', '2026-11-01')).documentId, 'admin.rao');
    const st = async (today: string) => Object.fromEntries((await listVersions(KEY, today)).map((v) => [v.version, v.servingState]));
    expect(await st('2026-10-23')).toEqual({ '2.0': 'SCHEDULED', '1.0': 'ACTIVE' });
    expect(await st('2026-11-01')).toEqual({ '2.0': 'ACTIVE', '1.0': 'SUPERSEDED' });
    expect((await listVersions(KEY, '2026-10-23')).map((v) => v.version)).toEqual(['2.0', '1.0']);   // newest first
    await expect(listVersions('TEST-NOPE')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});
