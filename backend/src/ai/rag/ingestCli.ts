// CLI: `npm run ingest` (via ingest.ts) or `npx tsx src/ai/rag/ingestCli.ts`.
import { prisma } from '../../common/prisma';
import { ingestAll } from './ingest';
import { inForceIds, todayIso } from './retriever';
import { servingStateOf } from './policyAdminService';

try {
  await ingestAll();
  const today = todayIso();
  const active = new Set(await inForceIds(today));
  const rows = await prisma.kbDocument.findMany({ include: { _count: { select: { chunks: true } } }, orderBy: [{ documentKey: 'asc' }, { effectiveDate: 'asc' }] });
  for (const r of rows) console.log([r.documentKey, r.version, r.status, servingStateOf(r, active, today), r._count.chunks].join('\t'));
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
