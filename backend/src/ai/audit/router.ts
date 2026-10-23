import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, currentUser } from '../../common/auth';
import { AppError, asyncHandler } from '../../common/errors';
import { getAuditTrail } from './auditService';

const Params = z.object({ auditTrailId: z.string().regex(/^AUD-(\d{4}|POL)-\d{5}$/) });

// Mounted at /api/audit.
export const auditRouter = Router();
auditRouter.get('/:auditTrailId', requireAuth, requireRole('LOAN_OFFICER', 'CREDIT_ANALYST', 'POLICY_ADMIN'), asyncHandler(async (req, res) => {
  const { auditTrailId } = Params.parse(req.params);
  if (currentUser(req).role === 'POLICY_ADMIN' && !auditTrailId.startsWith('AUD-POL-')) throw new AppError(403, 'FORBIDDEN', 'POLICY_ADMIN may read only policy audit trails');
  res.json(await getAuditTrail(auditTrailId));
}));
