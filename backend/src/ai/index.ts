import { Router } from 'express';
import { setMasker, logger } from '../common/logger';
import { maskObject, maskPii } from './masking/piiMasker';
import { ragRouter } from './rag/router';
import { policyAdminRouter } from './rag/policyAdminRouter';
import { ensureKnowledgeBase } from './rag/ingest';
import { advisorRouter } from './advisor/router';
import { agentsRouter } from './agents/router';
import { auditRouter } from './audit/router';

// Owned by S2. Mounted by S1's app.ts at /api. Final paths match openapi.yaml.
// The logger sends both JSON payloads and plain messages through this hook; numeric PII must stay valid JSON.
setMasker((text) => {
  try { return JSON.stringify(maskObject(JSON.parse(text))); }
  catch { return maskPii(text); }
});

export const aiRouter = Router();
aiRouter.use(ragRouter);                              // POST /policy/ask, GET /knowledge/documents
aiRouter.use('/admin/policies', policyAdminRouter);   // POLICY_ADMIN lifecycle (X-1)
aiRouter.use('/advisor', advisorRouter);              // POST /advisor/chat
aiRouter.use('/workflow', agentsRouter);              // POST /workflow/applications/:id/run, GET .../recommendation
aiRouter.use('/audit', auditRouter);                  // GET /audit/:auditTrailId

if (process.env.NODE_ENV !== 'test') void ensureKnowledgeBase().catch((e) => logger.error({ err: e }, 'kb seed failed'));
