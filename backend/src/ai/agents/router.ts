import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth, requireRole } from '../../common/auth';
import { asyncHandler } from '../../common/errors';
import { getLatestRecommendation } from '../audit/auditService';
import { runWorkflow } from './orchestrator';

const Params = z.object({ applicationId: z.string().regex(/^LA-\d{4}-\d{5}$/) });
const Query = z.object({ demoPermissionViolation: z.enum(['true', 'false']).optional() });

// Mounted at /api/workflow. Staff-only, so the G-4 demo hook is staff-only too.
export const agentsRouter = Router();
agentsRouter.use(requireAuth, requireRole('LOAN_OFFICER', 'CREDIT_ANALYST'));
agentsRouter.post('/applications/:applicationId/run', asyncHandler(async (req, res) => {
  const { applicationId } = Params.parse(req.params);
  const { demoPermissionViolation } = Query.parse(req.query);
  res.json(await runWorkflow(applicationId, currentUser(req), { demoPermissionViolation: demoPermissionViolation === 'true' }));
}));
agentsRouter.get('/applications/:applicationId/recommendation', asyncHandler(async (req, res) => {
  res.json(await getLatestRecommendation(Params.parse(req.params).applicationId));
}));
