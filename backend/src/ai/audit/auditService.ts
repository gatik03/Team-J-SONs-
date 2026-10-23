import { randomInt } from 'node:crypto';
import { Prisma, type PolicyStatus } from '@prisma/client';
import { prisma } from '../../common/prisma';
import { maskObject } from '../masking/piiMasker';
import { AppError } from '../../common/errors';
import { newId } from '../../common/ids';
import { AgentRecommendationSchema, type AgentRecommendation } from '../agents/schemas';
import type { AuditWriter } from '../agents/types';

const isUniqueConflict = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

// Inserts a row with a fresh random id, retrying on the (rare) unique collision.
async function insertRunWithRandomId(makeId: () => string, applicationId: string): Promise<string> {
  for (let i = 0; ; i++) {
    const auditTrailId = makeId();
    try {
      await prisma.agentRun.create({ data: { auditTrailId, applicationId } });
      return auditTrailId;
    } catch (e) {
      if (!isUniqueConflict(e) || i >= 9) throw e;
    }
  }
}

// One AUD-POL-NNNNN trail per policy (documentKey), holding its whole governance history (step 1.11).
export async function recordPolicyEvent(e: { actor: string; eventType: 'POLICY_DRAFTED' | 'POLICY_PUBLISHED' | 'POLICY_RETIRED';
  documentKey: string; version: string; changeNote?: string; reason?: string; status: PolicyStatus }): Promise<string> {
  const existing = await prisma.agentRun.findFirst({ where: { applicationId: e.documentKey, auditTrailId: { startsWith: 'AUD-POL-' } } });
  const auditTrailId = existing?.auditTrailId
    ?? await insertRunWithRandomId(() => `AUD-POL-${String(randomInt(0, 100000)).padStart(5, '0')}`, e.documentKey);
  const input = e.eventType === 'POLICY_RETIRED'
    ? { documentKey: e.documentKey, version: e.version, reason: e.reason }
    : { documentKey: e.documentKey, version: e.version, changeNote: e.changeNote };
  await prisma.$transaction(async (tx) => {
    const max = await tx.auditEvent.aggregate({ where: { auditTrailId }, _max: { sequence: true } });
    await tx.auditEvent.create({ data: { auditTrailId, sequence: (max._max.sequence ?? 0) + 1, agent: e.actor, eventType: e.eventType,
      toolName: null, input: maskObject(input) as Prisma.InputJsonObject, output: maskObject({ status: e.status }), durationMs: 0 } });
  });
  return auditTrailId;
}

// ---- Agent workflow trails (step 3.2) ----
const json = (v: Record<string, unknown>) => maskObject(v) as Prisma.InputJsonObject;

export async function createTrail(applicationId: string): Promise<AuditWriter> {
  const auditTrailId = await insertRunWithRandomId(() => newId('AUD'), applicationId);
  let sequence = 0;
  return {
    auditTrailId,
    async record(e) {
      sequence += 1;
      await prisma.auditEvent.create({ data: { auditTrailId, sequence, timestamp: new Date(), agent: e.agent, eventType: e.eventType,
        toolName: e.toolName ?? null, input: json(e.input ?? {}), output: json(e.output ?? {}), durationMs: Math.round(e.durationMs ?? 0) } });
    },
  };
}

export async function completeTrail(auditTrailId: string, recommendation: AgentRecommendation): Promise<void> {
  await prisma.agentRun.update({ where: { auditTrailId }, data: { completedAt: new Date(), recommendation: recommendation as unknown as Prisma.InputJsonObject } });
}

export interface AuditTrailDto { auditTrailId: string; applicationId: string; startedAt: string; completedAt: string | null;
  events: { sequence: number; timestamp: string; agent: string; eventType: string; toolName: string | null; input: unknown; output: unknown; durationMs: number }[] }

export async function getAuditTrail(auditTrailId: string): Promise<AuditTrailDto> {
  const run = await prisma.agentRun.findUnique({ where: { auditTrailId }, include: { events: { orderBy: { sequence: 'asc' } } } });
  if (!run) throw new AppError(404, 'NOT_FOUND', `Audit trail ${auditTrailId} not found`);
  return {
    auditTrailId: run.auditTrailId, applicationId: run.applicationId, startedAt: run.startedAt.toISOString(), completedAt: run.completedAt?.toISOString() ?? null,
    events: run.events.map((ev) => ({ sequence: ev.sequence, timestamp: ev.timestamp.toISOString(), agent: ev.agent, eventType: ev.eventType,
      toolName: ev.toolName, input: ev.input, output: ev.output, durationMs: ev.durationMs })),
  };
}

export async function getLatestRecommendation(applicationId: string): Promise<AgentRecommendation> {
  const run = await prisma.agentRun.findFirst({ where: { applicationId, recommendation: { not: Prisma.AnyNull } }, orderBy: { startedAt: 'desc' } });
  if (!run) throw new AppError(404, 'NOT_FOUND', `No agent recommendation for application ${applicationId}`);
  return AgentRecommendationSchema.parse(run.recommendation);
}
