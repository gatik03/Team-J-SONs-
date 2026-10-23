import { Prisma } from '@prisma/client';
import { toSql } from 'pgvector';
import { prisma } from '../../common/prisma';
import { embedQuery } from './embeddings';

export type Audience = 'CUSTOMER' | 'INTERNAL';
export interface RetrieveFilters { loanType?: string; customerSegment?: string; documentType?: string }
export interface RetrievedChunk { id: string; section: string; content: string; title: string; version: string;
  effectiveDate: string /* YYYY-MM-DD */; audience: Audience; loanType: string; distance: number }
export interface RetrieveOptions { onlyDocumentId?: string; today?: string /* YYYY-MM-DD, default todayIso() */ }

// Live Gemini calibration: relevant top-1 ≤ 0.298; customer waiver 0.343; off-topic 0.502 (docs/TEST_PROMPTS.md).
export const MAX_DISTANCE = 0.32;   // cosine distance

export function allowedAudiences(a: Audience): Audience[] {
  return a === 'CUSTOMER' ? ['CUSTOMER'] : ['CUSTOMER', 'INTERNAL'];
}

export const todayIso = (now: Date = new Date()): string => now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD

export const inForceCte = (today: string) => Prisma.sql`in_force AS (
  SELECT DISTINCT ON (document_key) id FROM kb_document
  WHERE status = 'PUBLISHED' AND effective_date <= ${today}::date
  ORDER BY document_key, effective_date DESC, published_at DESC)`;   // the ONE definition of "version in force" (Integration_Contracts §8a)

export async function inForceIds(today = todayIso()): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`WITH ${inForceCte(today)} SELECT id FROM in_force`;
  return rows.map((r) => r.id);
}

type RawRow = Omit<RetrievedChunk, 'distance'> & { distance: number | string };

export async function retrieve(question: string, audience: Audience, filters: RetrieveFilters = {}, k = 5, opts: RetrieveOptions = {}): Promise<RetrievedChunk[]> {
  const v = toSql(await embedQuery(question));   // normalised 768-dim; failure → 503 AI_UNAVAILABLE
  const today = opts.today ?? todayIso();
  const use = (x?: string) => (x && x !== 'ALL' ? x : undefined);
  const f = { loanType: use(filters.loanType), customerSegment: use(filters.customerSegment), documentType: use(filters.documentType) };
  // test-ask (admin): search ONLY this version, whatever its status; no in_force, no audience/loanType/segment/documentType filter
  const scope = opts.onlyDocumentId
    ? Prisma.sql`WHERE d.id = ${opts.onlyDocumentId}`
    : Prisma.sql`JOIN in_force inf ON inf.id = d.id
      WHERE d.audience::text IN (${Prisma.join(allowedAudiences(audience))})
        ${f.loanType ? Prisma.sql`AND d.loan_type::text IN (${f.loanType}, 'ALL')` : Prisma.empty}
        ${f.customerSegment ? Prisma.sql`AND d.customer_segment::text IN (${f.customerSegment}, 'ALL')` : Prisma.empty}
        ${f.documentType ? Prisma.sql`AND d.document_type::text = ${f.documentType}` : Prisma.empty}`;
  // ef_search 200 > whole demo KB, so HNSW looks at enough candidates before the WHERE filter drops non-served rows.
  const rows = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL hnsw.ef_search = 200`;
    return tx.$queryRaw<RawRow[]>`
      WITH ${inForceCte(today)}
      SELECT c.id, c.section, c.content, d.title, d.version,
             to_char(d.effective_date, 'YYYY-MM-DD') AS "effectiveDate",
             d.audience::text AS audience, d.loan_type::text AS "loanType",
             (c.embedding <=> ${v}::vector(768)) AS distance
      FROM kb_chunk c JOIN kb_document d ON d.id = c.document_id
      ${scope}
      ORDER BY c.embedding <=> ${v}::vector(768)
      LIMIT ${k}`;
  });
  return rows.map((r) => ({ ...r, distance: Number(r.distance) }));
}
