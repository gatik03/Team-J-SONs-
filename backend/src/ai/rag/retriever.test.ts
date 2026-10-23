import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../common/prisma';
import { ingestFile, type KbMeta } from './ingest';
import { inForceIds, retrieve, todayIso } from './retriever';

// No network: a deterministic hashed bag-of-words embedder stands in for Gemini, so the SQL (in-force CTE,
// audience/loanType filters, test-ask scope) is exercised against the real Postgres + pgvector.
const { bow } = vi.hoisted(() => ({
  bow: (text: string): number[] => {
    const v = Array(768).fill(0) as number[]; v[0] = 1e-3;
    for (const w of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
      let h = 0; for (const ch of w.slice(0, 6)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;   // crude stem: first 6 chars
      v[h % 768]! += 1;
    }
    const n = Math.hypot(...v); return v.map((x) => x / n);
  },
}));
vi.mock('./embeddings', () => ({
  embedDocuments: vi.fn(async (t: string[]) => t.map(bow)),
  embedQuery: vi.fn(async (q: string) => bow(q)),
}));

const kb = (f: string) => readFileSync(new URL(`../../../../db/knowledge/${f}`, import.meta.url));
const base = { loanType: 'ALL', documentType: 'TERMS_AND_CONDITIONS', audience: 'CUSTOMER', customerSegment: 'ALL' } as const;
const add = (fileName: string, buffer: Buffer, meta: Partial<KbMeta> & Pick<KbMeta, 'documentKey' | 'title' | 'version' | 'effectiveDate'>, status: 'DRAFT' | 'PUBLISHED' = 'PUBLISHED') =>
  ingestFile({ buffer, fileName, meta: { ...base, ...meta }, status, createdBy: 'test', changeNote: 'test fixture' });
const KEYS = ['TEST-VEHICLE', 'TEST-PLAYBOOK', 'TEST-ZORBLAX', 'TEST-STUDENT'];
const cleanup = () => prisma.kbDocument.deleteMany({ where: { documentKey: { in: KEYS } } });

describe('todayIso', () => {
  it('is the Asia/Kolkata calendar date', () => {
    expect(todayIso(new Date('2026-10-22T19:00:00Z'))).toBe('2026-10-23');   // 00:30 IST
  });
});

describe.skipIf(!process.env.DATABASE_URL)('retriever (Postgres, mocked embeddings)', { timeout: 60_000 }, () => {
  const ids: Record<string, string> = {};
  beforeAll(async () => {
    await cleanup();
    const veh = { documentKey: 'TEST-VEHICLE', title: 'Vehicle Loan Terms and Conditions', loanType: 'VEHICLE' } as const;
    ids.v2025 = (await add('v.md', kb('vehicle-loan-terms-v2025.1.md'), { ...veh, version: '2025.1', effectiveDate: '2025-04-01' })).documentId;
    ids.v2026 = (await add('v.md', kb('vehicle-loan-terms-v2026.3.md'), { ...veh, version: '2026.3', effectiveDate: '2026-07-01' })).documentId;
    await add('p.md', kb('loan-officer-playbook-v2026.1.md'), { documentKey: 'TEST-PLAYBOOK', title: 'Loan Officer Playbook', version: '2026.1',
      effectiveDate: '2026-01-01', documentType: 'OFFICER_PLAYBOOK', audience: 'INTERNAL' });
    await add('student.md', Buffer.from('## Student documents\nStudent admission documents and fees.'), { documentKey: 'TEST-STUDENT',
      title: 'Student Only Checklist', version: '1.0', effectiveDate: '2026-01-01', customerSegment: 'STUDENT' });
    const z = (fee: string) => Buffer.from(`# Zorblax Card Terms\n## Annual Fee\nThe Zorblax card annual fee is ₹${fee}.\n`);
    const zm = { documentKey: 'TEST-ZORBLAX', title: 'Zorblax Card Terms' };
    ids.z1 = (await add('z.md', z('111'), { ...zm, version: '1.0', effectiveDate: '2026-01-01' })).documentId;
    ids.z2 = (await add('z.md', z('222'), { ...zm, version: '2.0', effectiveDate: '2026-02-01' }, 'DRAFT')).documentId;
    ids.z3 = (await add('z.md', z('333'), { ...zm, version: '3.0', effectiveDate: '2026-11-01' })).documentId;
  });
  afterAll(cleanup);

  const FQ = 'Can I foreclose my vehicle loan after six months, and are there any charges?';
  it('1. serves the vehicle version in force, never the superseded one', async () => {
    const rows = await retrieve(FQ, 'CUSTOMER', {}, 5, { today: '2026-08-01' });
    expect(rows.some((r) => r.title === 'Vehicle Loan Terms and Conditions' && r.version === '2026.3')).toBe(true);
    expect(rows.some((r) => r.version === '2025.1')).toBe(false);
  });

  it('2. inForceIds picks the highest effectiveDate ≤ today', async () => {
    const ids0 = await inForceIds('2026-08-01');
    expect(ids0).toContain(ids.v2026);
    expect(ids0).not.toContain(ids.v2025);
  });

  it('3. INTERNAL documents only for staff', async () => {
    const q = 'What processing fee waiver can loan officers offer to salaried customers with high credit scores?';
    expect((await retrieve(q, 'CUSTOMER')).some((r) => r.audience === 'INTERNAL')).toBe(false);
    expect((await retrieve(q, 'INTERNAL')).some((r) => r.title === 'Loan Officer Playbook')).toBe(true);
  });

  it('4. loanType filter keeps only that type or ALL', async () => {
    const rows = await retrieve(FQ, 'INTERNAL', { loanType: 'HOME' });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => ['HOME', 'ALL'].includes(r.loanType))).toBe(true);
  });

  it('filters document type before ranking', async () => {
    const rows = await retrieve('Processing fee waiver', 'INTERNAL', { documentType: 'OFFICER_PLAYBOOK' });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.title === 'Loan Officer Playbook' && r.audience === 'INTERNAL')).toBe(true);
  });

  it('includes ALL segments but excludes student-only documents for salaried customers', async () => {
    const q = 'Student admission documents and fees';
    const student = await retrieve(q, 'CUSTOMER', { customerSegment: 'STUDENT' }, 200);
    expect(student.some((r) => r.title === 'Student Only Checklist')).toBe(true);
    const salaried = await retrieve(q, 'CUSTOMER', { customerSegment: 'SALARIED' }, 200);
    expect(salaried.some((r) => r.title === 'Student Only Checklist')).toBe(false);
    expect(salaried.some((r) => r.title === 'Vehicle Loan Terms and Conditions')).toBe(true);
  });

  const served = async (today: string) => (await retrieve('What is the Zorblax card annual fee?', 'CUSTOMER', {}, 5, { today }))
    .filter((r) => r.title === 'Zorblax Card Terms').map((r) => r.version);

  it('5. DRAFT never served', async () => {
    expect(await served('2026-10-23')).toContain('1.0');
    expect(await served('2026-10-23')).not.toContain('2.0');
    expect(await served('2026-12-31')).not.toContain('2.0');
  });

  it('6. SCHEDULED not served before its date', async () => {
    expect(await served('2026-10-31')).toEqual(['1.0']);
    expect(await served('2026-11-01')).toEqual(['3.0']);
  });

  it('7. retiring the active version brings the previous one back', async () => {
    await prisma.kbDocument.update({ where: { documentKey_version: { documentKey: 'TEST-ZORBLAX', version: '3.0' } },
      data: { status: 'RETIRED', retiredAt: new Date(), retiredReason: 'test rollback' } });
    expect(await served('2026-11-01')).toEqual(['1.0']);
  });

  it('8. test-ask scope searches only the chosen version, even a DRAFT', async () => {
    const rows = await retrieve('What is the Zorblax card annual fee?', 'CUSTOMER', {}, 5, { onlyDocumentId: ids.z2 });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.version === '2.0')).toBe(true);
  });
});
