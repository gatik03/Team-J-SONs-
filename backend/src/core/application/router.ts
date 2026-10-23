import { Router } from 'express';
import { requireAuth, requireRole } from '../../common/auth';
import { AppError, asyncHandler } from '../../common/errors';
import { prisma } from '../../common/prisma';
import {
  LoanApplicationDraftSchema,
  DecisionSchema,
  ApplicationListQuerySchema,
} from './schemas';
import * as applicationService from './service';
import { documentRouter } from '../document/router';

export const applicationRouter = Router();

// Mount document sub-router
applicationRouter.use('/:applicationId/documents', documentRouter);

// GET /api/applications
applicationRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.role === 'POLICY_ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Role POLICY_ADMIN is not allowed to list applications');
    }

    const query = ApplicationListQuerySchema.parse(req.query);
    const filter = user.role === 'CUSTOMER' ? { customerId: user.customerId!, ...query } : query;

    const list = await applicationService.listApplications(filter);
    res.json(list);
  })
);

// POST /api/applications
applicationRouter.post(
  '/',
  requireAuth,
  requireRole('CUSTOMER'),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (!user.customerId) {
      throw new AppError(401, 'UNAUTHORIZED', 'Customer profile not found for user');
    }
    const input = LoanApplicationDraftSchema.parse(req.body);
    const created = await applicationService.createApplication(
      user.customerId,
      user.username,
      input
    );
    res.status(201).json(created);
  })
);

// GET /api/applications/:applicationId
applicationRouter.get(
  '/:applicationId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.role === 'POLICY_ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Role POLICY_ADMIN is not allowed to view applications');
    }

    const { applicationId } = req.params;
    const row = await prisma.loanApplication.findUnique({
      where: { applicationId },
      include: { events: true },
    });
    if (!row) {
      throw new AppError(404, 'NOT_FOUND', `Application ${applicationId} not found`);
    }

    if (user.role === 'CUSTOMER' && row.customerId !== user.customerId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not own this application');
    }

    res.json(applicationService.toLoanApplication(row));
  })
);

// PUT /api/applications/:applicationId
applicationRouter.put(
  '/:applicationId',
  requireAuth,
  requireRole('CUSTOMER'),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (!user.customerId) {
      throw new AppError(401, 'UNAUTHORIZED', 'Customer profile not found for user');
    }
    const { applicationId } = req.params;
    const input = LoanApplicationDraftSchema.parse(req.body);
    const updated = await applicationService.updateDraft(applicationId, user.customerId, input);
    res.json(updated);
  })
);

// POST /api/applications/:applicationId/submit
applicationRouter.post(
  '/:applicationId/submit',
  requireAuth,
  requireRole('CUSTOMER'),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (!user.customerId) {
      throw new AppError(401, 'UNAUTHORIZED', 'Customer profile not found for user');
    }
    const { applicationId } = req.params;
    const submitted = await applicationService.submitApplication(
      applicationId,
      user.customerId,
      user.username
    );
    res.json(submitted);
  })
);

// POST /api/applications/:applicationId/decision (CREDIT_ANALYST only)
applicationRouter.post(
  '/:applicationId/decision',
  requireAuth,
  requireRole('CREDIT_ANALYST'),
  asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    const { decision, reason } = DecisionSchema.parse(req.body);
    const decided = await applicationService.transition(
      applicationId,
      decision,
      req.user!.username,
      reason
    );
    res.json(decided);
  })
);
