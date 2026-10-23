import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../common/prisma';
import { embedDocuments } from './embeddings';
import { ingestFile, KbMetaSchema, type KbMeta } from './ingest';

vi.mock('./embeddings', () => ({
  embedDocuments: vi.fn(async (texts: string[]) => texts.map(() => Array(768).fill(1 / Math.sqrt(768)))),
  embedQuery: vi.fn(),
}));

const meta: KbMeta = { documentKey: 'TEST-INGEST', title: 'Test Ingestion Policy', version: '1.0', effectiveDate: '2026-01-01',
  loanType: 'ALL', documentType: 'TERMS_AND_CONDITIONS', audience: 'CUSTOMER', customerSegment: 'ALL' };
const upload = (fileName: string, buffer: Buffer, metadata = meta) => ingestFile({ fileName, buffer, meta: metadata,
  status: 'DRAFT', createdBy: 'test', changeNote: 'Test fixture' });
const clean = () => prisma.kbDocument.deleteMany({ where: { documentKey: meta.documentKey } });

it.each(['2026-02-30', '2026-13-01', '2026-00-01'])('rejects invalid calendar date %s', (effectiveDate) => {
  expect(KbMetaSchema.safeParse({ ...meta, effectiveDate }).success).toBe(false);
});

describe.skipIf(!process.env.DATABASE_URL)('ingestion (Postgres, embeddings mocked)', () => {
  beforeEach(async () => { await clean(); vi.clearAllMocks(); });
  afterAll(clean);

  it.each([
    ['policy.md', Buffer.from('# Policy\n## Charges\nThe charge is 2%.')],
    ['policy.csv', Buffer.from('section,charge\nCharges,2%\n')],
    ['policy.json', Buffer.from('{"Charges":"The charge is 2%."}')],
    ['policy.pdf', readFileSync(new URL('../../../../db/knowledge/regulatory-circular-summary-v2026.1.pdf', import.meta.url))],
  ])('parses and stores %s with its sections and 768-dimensional vectors', async (fileName, buffer) => {
    const doc = await upload(fileName, buffer);
    const chunks = await prisma.kbChunk.findMany({ where: { documentId: doc.documentId }, orderBy: { ordinal: 'asc' } });
    expect(doc.chunkCount).toBeGreaterThan(0);
    expect(chunks).toHaveLength(doc.chunkCount);
    expect(chunks.every((c, i) => c.ordinal === i && c.section && c.content)).toBe(true);
    if (fileName.endsWith('.pdf')) expect(chunks.some((c) => c.section === 'Key Fact Statement')).toBe(true);
    const rows = await prisma.$queryRaw<{ dims: number }[]>`SELECT vector_dims(embedding) AS dims FROM kb_chunk WHERE document_id = ${doc.documentId}`;
    expect(rows.every((r) => r.dims === 768)).toBe(true);
  });

  it('masks PII in headings, content and embedding inputs', async () => {
    const doc = await upload('p.md', Buffer.from('## PAN ABCDE1234F\nAadhaar 1234 5678 9012, account 50100123456789'));
    const chunks = await prisma.kbChunk.findMany({ where: { documentId: doc.documentId } });
    const stored = JSON.stringify(chunks);
    expect(stored).not.toContain('ABCDE1234F');
    expect(stored).not.toContain('1234 5678 9012');
    expect(stored).toContain('XXXXX1234X');
    expect(JSON.stringify(vi.mocked(embedDocuments).mock.calls)).not.toContain('ABCDE1234F');
  });

  it.each([['p.json', '{broken'], ['p.md', '   '], ['p.exe', 'text']])('rejects malformed, empty or unsupported uploads (%s)', async (file, text) => {
    await expect(upload(file, Buffer.from(text))).rejects.toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
    expect(embedDocuments).not.toHaveBeenCalled();
    expect(await prisma.kbDocument.count({ where: { documentKey: meta.documentKey } })).toBe(0);
  });
});
