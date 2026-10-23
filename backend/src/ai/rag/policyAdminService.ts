import type { KbDocument, PolicyStatus } from '@prisma/client';
import { AppError } from '../../common/errors';
import { prisma } from '../../common/prisma';
import { recordPolicyEvent } from '../audit/auditService';
import { maskPii } from '../masking/piiMasker';
import { ingestFile, toKnowledgeDocumentDto, type KbMeta, type KnowledgeDocumentDto } from './ingest';
import { askPolicy } from './policyAssistant';
import { inForceIds, todayIso } from './retriever';
import type { PolicyAnswer } from './schemas';

// X-1 / ADR-18: DRAFT → PUBLISHED → RETIRED, rows never edited in content; "in force" is computed by inForceCte only.
export type ServingState = 'ACTIVE' | 'SCHEDULED' | 'SUPERSEDED' | 'DRAFT' | 'RETIRED';
export type PolicyVersionDto = KnowledgeDocumentDto & {
  changeNote: string; createdBy: string; publishedBy: string | null; publishedAt: string | null;
  retiredAt: string | null; retiredReason: string | null; servingState: ServingState;
};
export interface PolicyLibraryItem {
  documentKey: string; title: string; documentType: string; audience: string;
  activeVersion: string | null; activeEffectiveDate: string | null;
  scheduledVersion: string | null; scheduledEffectiveDate: string | null;
  draftCount: number; totalVersions: number;
}
type Row = KbDocument & { _count: { chunks: number } };
const withCount = { _count: { select: { chunks: true } } } as const;
const ymd = (d: Date) => d.toISOString().slice(0, 10);

export function servingStateOf(row: { id: string; status: PolicyStatus; effectiveDate: Date }, activeIds: Set<string>, today: string): ServingState {
  if (row.status === 'DRAFT') return 'DRAFT';
  if (row.status === 'RETIRED') return 'RETIRED';
  if (activeIds.has(row.id)) return 'ACTIVE';
  return ymd(row.effectiveDate) > today ? 'SCHEDULED' : 'SUPERSEDED';
}

const toVersionDto = (r: Row, active: Set<string>, today: string): PolicyVersionDto => ({
  ...toKnowledgeDocumentDto(r), changeNote: r.changeNote, createdBy: r.createdBy, publishedBy: r.publishedBy,
  publishedAt: r.publishedAt?.toISOString() ?? null, retiredAt: r.retiredAt?.toISOString() ?? null,
  retiredReason: r.retiredReason, servingState: servingStateOf(r, active, today),
});

async function versionDto(id: string, today: string): Promise<PolicyVersionDto> {
  const row = await prisma.kbDocument.findUniqueOrThrow({ where: { id }, include: withCount });
  return toVersionDto(row, new Set(await inForceIds(today)), today);
}

async function mustFind(documentId: string): Promise<KbDocument> {
  const row = await prisma.kbDocument.findUnique({ where: { id: documentId } });
  if (!row) throw new AppError(404, 'NOT_FOUND', `Policy version ${documentId} not found`);
  return row;
}

export async function listLibrary(today = todayIso()): Promise<PolicyLibraryItem[]> {
  const rows = await prisma.kbDocument.findMany({ include: withCount, orderBy: [{ effectiveDate: 'desc' }, { ingestedAt: 'desc' }] });
  const active = new Set(await inForceIds(today));
  const byKey = new Map<string, Row[]>();
  for (const r of rows) byKey.set(r.documentKey, [...(byKey.get(r.documentKey) ?? []), r]);
  return [...byKey].map(([documentKey, rs]) => {
    const newest = rs[0]!;   // rows are newest first
    const act = rs.find((r) => servingStateOf(r, active, today) === 'ACTIVE');
    const sched = rs.filter((r) => servingStateOf(r, active, today) === 'SCHEDULED').at(-1);   // earliest effectiveDate
    return {
      documentKey, title: newest.title, documentType: newest.documentType, audience: newest.audience,
      activeVersion: act?.version ?? null, activeEffectiveDate: act ? ymd(act.effectiveDate) : null,
      scheduledVersion: sched?.version ?? null, scheduledEffectiveDate: sched ? ymd(sched.effectiveDate) : null,
      draftCount: rs.filter((r) => r.status === 'DRAFT').length, totalVersions: rs.length,
    };
  }).sort((a, b) => a.title.localeCompare(b.title));
}

export async function listVersions(documentKey: string, today = todayIso()): Promise<PolicyVersionDto[]> {
  const rows = await prisma.kbDocument.findMany({ where: { documentKey }, include: withCount, orderBy: [{ effectiveDate: 'desc' }, { ingestedAt: 'desc' }] });
  if (!rows.length) throw new AppError(404, 'NOT_FOUND', `Policy ${documentKey} not found`);
  const active = new Set(await inForceIds(today));
  return rows.map((r) => toVersionDto(r, active, today));
}

export async function uploadDraft(args: { buffer: Buffer; fileName: string; meta: KbMeta; changeNote: string; actor: string }): Promise<PolicyVersionDto> {
  const { meta, changeNote, actor } = args;
  const dto = await ingestFile({ buffer: args.buffer, fileName: args.fileName, meta, status: 'DRAFT', createdBy: actor, changeNote });
  await recordPolicyEvent({ actor, eventType: 'POLICY_DRAFTED', documentKey: meta.documentKey, version: meta.version, changeNote, status: 'DRAFT' });
  return versionDto(dto.documentId, todayIso());
}

export async function previewVersion(documentId: string): Promise<{ section: string; content: string }[]> {
  await mustFind(documentId);
  return prisma.kbChunk.findMany({ where: { documentId }, orderBy: { ordinal: 'asc' }, select: { section: true, content: true } });
}

/** Staff audience, this version only (works for DRAFT). Writes no audit event and changes nothing. */
export async function testAsk(documentId: string, question: string): Promise<PolicyAnswer> {
  await mustFind(documentId);
  return askPolicy(maskPii(question), {}, 'INTERNAL', { onlyDocumentId: documentId });
}

export async function publishVersion(documentId: string, actor: string, today = todayIso()): Promise<PolicyVersionDto> {
  const row = await mustFind(documentId);
  const invalid = (s: PolicyStatus) => new AppError(409, 'INVALID_STATE', `Only DRAFT versions can be published (current: ${s})`);
  if (row.status !== 'DRAFT') throw invalid(row.status);
  const { count } = await prisma.kbDocument.updateMany({ where: { id: documentId, status: 'DRAFT' }, data: { status: 'PUBLISHED', publishedBy: actor, publishedAt: new Date() } });
  if (count === 0) throw invalid((await mustFind(documentId)).status);   // lost a double-click race
  await recordPolicyEvent({ actor, eventType: 'POLICY_PUBLISHED', documentKey: row.documentKey, version: row.version, changeNote: row.changeNote, status: 'PUBLISHED' });
  return versionDto(documentId, today);
}

export async function retireVersion(documentId: string, reason: string, actor: string, today = todayIso()): Promise<PolicyVersionDto> {
  const why = (reason ?? '').trim();
  if (why.length < 5) throw new AppError(400, 'VALIDATION_FAILED', 'Retire reason is required (min 5 characters)', [{ field: 'reason', issue: 'min 5 characters' }]);
  const row = await mustFind(documentId);
  const invalid = (s: PolicyStatus) => new AppError(409, 'INVALID_STATE', `Only PUBLISHED versions can be retired (current: ${s})`);
  if (row.status !== 'PUBLISHED') throw invalid(row.status);
  const { count } = await prisma.kbDocument.updateMany({ where: { id: documentId, status: 'PUBLISHED' }, data: { status: 'RETIRED', retiredAt: new Date(), retiredReason: why } });
  if (count === 0) throw invalid((await mustFind(documentId)).status);
  await recordPolicyEvent({ actor, eventType: 'POLICY_RETIRED', documentKey: row.documentKey, version: row.version, reason: why, status: 'RETIRED' });
  return versionDto(documentId, today);
}
