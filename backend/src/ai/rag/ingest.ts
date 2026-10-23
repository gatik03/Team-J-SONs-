import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Prisma, type KbDocument } from '@prisma/client';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { toSql } from 'pgvector';
import { z } from 'zod';
import { AppError } from '../../common/errors';
import { logger } from '../../common/logger';
import { prisma } from '../../common/prisma';
import { maskObject } from '../masking/piiMasker';
import { chunkCsv, chunkJson, chunkMarkdown, chunkPdfText, type Chunk } from './chunker';
import { embedDocuments } from './embeddings';
import { inForceIds, todayIso } from './retriever';

export const KbMetaSchema = z.object({
  documentKey: z.string().regex(/^[A-Z0-9]+(-[A-Z0-9]+)*$/),
  title: z.string().min(3), version: z.string().min(1),
  effectiveDate: z.string().date(),
  loanType: z.enum(['PERSONAL', 'HOME', 'VEHICLE', 'EDUCATION', 'ALL']),
  documentType: z.enum(['TERMS_AND_CONDITIONS', 'RATE_FEE_SCHEDULE', 'CREDIT_POLICY', 'KYC_CHECKLIST', 'PREPAYMENT_POLICY', 'GRIEVANCE', 'REGULATORY_CIRCULAR', 'OFFICER_PLAYBOOK']),
  audience: z.enum(['CUSTOMER', 'INTERNAL']),
  customerSegment: z.enum(['SALARIED', 'SELF_EMPLOYED', 'STUDENT', 'ALL']).default('ALL'),
});
export type KbMeta = z.infer<typeof KbMetaSchema>;

/** openapi KnowledgeDocument; the version in force is computed at query time. */
export interface KnowledgeDocumentDto {
  documentId: string; documentKey: string; title: string; version: string; effectiveDate: string;
  loanType: string; documentType: string; audience: string; customerSegment: string; status: string;
  chunkCount: number; ingestedAt: string;
}

export function toKnowledgeDocumentDto(row: KbDocument & { _count: { chunks: number } }): KnowledgeDocumentDto {
  return {
    documentId: row.id, documentKey: row.documentKey, title: row.title, version: row.version,
    effectiveDate: row.effectiveDate.toISOString().slice(0, 10), loanType: row.loanType, documentType: row.documentType,
    audience: row.audience, customerSegment: row.customerSegment, status: row.status,
    chunkCount: row._count.chunks, ingestedAt: row.ingestedAt.toISOString(),
  };
}

const CHUNKERS: Record<string, (text: string, title: string) => Chunk[]> = {
  '.md': chunkMarkdown, '.pdf': chunkPdfText, '.csv': chunkCsv, '.json': chunkJson,
};
const duplicate = (m: KbMeta) => new AppError(409, 'INVALID_STATE', `Version ${m.version} of ${m.documentKey} already exists; upload a new version number`);

export async function ingestFile(args: { buffer: Buffer; fileName: string; meta: KbMeta;
  status: 'DRAFT' | 'PUBLISHED'; createdBy: string; changeNote: string }): Promise<KnowledgeDocumentDto> {
  const { buffer, fileName, status, createdBy, changeNote } = args;
  const meta = KbMetaSchema.parse(args.meta);
  // 1. duplicate check first, so a duplicate never costs an embedding call
  const exists = await prisma.kbDocument.findUnique({ where: { documentKey_version: { documentKey: meta.documentKey, version: meta.version } }, select: { id: true } });
  if (exists) throw duplicate(meta);
  // 2-3. parse + chunk + mask
  const ext = extname(fileName).toLowerCase();
  const chunker = CHUNKERS[ext];
  if (!chunker) throw new AppError(400, 'VALIDATION_FAILED', `Unsupported file type ${ext || '(none)'}; use .pdf, .md, .csv or .json`, [{ field: 'file', issue: 'unsupported extension' }]);
  let chunks: Chunk[];
  try {
    // pdf-parse 1.1.4 fails on pooled Buffers: always hand it a fresh copy
    const text = ext === '.pdf' ? (await pdfParse(new Uint8Array(buffer) as unknown as Buffer)).text : buffer.toString('utf8');
    chunks = chunker(text, meta.title).map((c) => maskObject(c));
  } catch (e) {
    throw new AppError(400, 'VALIDATION_FAILED', `Could not parse ${fileName}: ${(e as Error).message}`, [{ field: 'file', issue: 'unparseable' }]);
  }
  if (!chunks.length) throw new AppError(400, 'VALIDATION_FAILED', `${fileName} contains no text`, [{ field: 'file', issue: 'empty' }]);
  // 4. embed before the transaction so a slow API call never holds it open
  const vectors = await embedDocuments(chunks.map((c) => `${meta.title} | ${c.metadata.headingPath.join(' > ')}\n${c.content}`));
  // 5. one transaction: document row + chunks
  try {
    const doc = await prisma.$transaction(async (tx) => {
      const d = await tx.kbDocument.create({ data: {
        ...meta, effectiveDate: new Date(meta.effectiveDate), status, changeNote, createdBy, sourceFile: fileName,
        ...(status === 'PUBLISHED' ? { publishedBy: createdBy, publishedAt: new Date() } : {}),
      } });
      for (const [i, c] of chunks.entries()) {
        await tx.$executeRaw`INSERT INTO kb_chunk (id, document_id, ordinal, section, content, metadata, embedding)
          VALUES (${randomUUID()}, ${d.id}, ${i}, ${c.section}, ${c.content}, ${JSON.stringify(c.metadata)}::jsonb, ${toSql(vectors[i])}::vector(768))`;
      }
      return d;
    }, { timeout: 30_000 });
    return toKnowledgeDocumentDto({ ...doc, _count: { chunks: chunks.length } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw duplicate(meta);
    throw e;
  }
}

const KNOWLEDGE_DIR = fileURLToPath(new URL('../../../../db/knowledge/', import.meta.url));
const ManifestSchema = z.array(KbMetaSchema.extend({ file: z.string() }));

/** Loads db/knowledge/manifest.json as PUBLISHED versions by `system`. Idempotent; demo/ files are never ingested here. */
export async function ingestAll(): Promise<KnowledgeDocumentDto[]> {
  const manifest = ManifestSchema.parse(JSON.parse(await readFile(`${KNOWLEDGE_DIR}manifest.json`, 'utf8')));
  const out: KnowledgeDocumentDto[] = [];
  for (const { file, ...meta } of manifest) {
    const exists = await prisma.kbDocument.findUnique({ where: { documentKey_version: { documentKey: meta.documentKey, version: meta.version } }, select: { id: true } });
    if (exists) { logger.info(`skipped ${meta.documentKey} v${meta.version} (exists)`); continue; }
    const dto = await ingestFile({ buffer: await readFile(`${KNOWLEDGE_DIR}${file}`), fileName: file, meta, status: 'PUBLISHED', createdBy: 'system', changeNote: 'Initial load' });
    logger.info(`ingested ${meta.documentKey} v${meta.version}: ${dto.chunkCount} chunks`);
    out.push(dto);
  }
  return out;
}

export async function ensureKnowledgeBase(): Promise<void> {
  if ((await prisma.kbDocument.count()) === 0) await ingestAll();
}

/** Versions IN FORCE only, sorted by title. */
export async function listKnowledgeDocuments(today = todayIso()): Promise<KnowledgeDocumentDto[]> {
  const rows = await prisma.kbDocument.findMany({ where: { id: { in: await inForceIds(today) } }, include: { _count: { select: { chunks: true } } }, orderBy: { title: 'asc' } });
  return rows.map(toKnowledgeDocumentDto);
}

// `npm run ingest` runs this file directly; the CLI (table printing) lives in ingestCli.ts. Not awaited: avoids an import-cycle deadlock.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void import('./ingestCli');
