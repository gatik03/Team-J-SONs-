import { Router } from 'express';
import { currentUser, requireAuth, requireRole } from '../../common/auth';
import { asyncHandler } from '../../common/errors';
import { listKnowledgeDocuments } from './ingest';
import { askPolicy } from './policyAssistant';
import { PolicyAskBodySchema } from './schemas';

// Mounted at aiRouter root (aiRouter is at /api): POST /api/policy/ask, GET /api/knowledge/documents.
export const ragRouter = Router();

ragRouter.post('/policy/ask', requireAuth, asyncHandler(async (req, res) => {
  const { question, loanType, customerSegment } = PolicyAskBodySchema.parse(req.body);
  // audience comes from the role, never from the body (M2-10)
  const audience = currentUser(req).role === 'CUSTOMER' ? 'CUSTOMER' : 'INTERNAL';
  res.json(await askPolicy(question, { loanType, customerSegment }, audience));
}));

ragRouter.get('/knowledge/documents', requireAuth, requireRole('LOAN_OFFICER', 'CREDIT_ANALYST', 'POLICY_ADMIN'),
  asyncHandler(async (_req, res) => { res.json(await listKnowledgeDocuments()); }));
