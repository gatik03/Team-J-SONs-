import { Router } from 'express';
import { currentUser, requireAuth } from '../../common/auth';
import { asyncHandler } from '../../common/errors';
import { advisorChat } from './advisorService';
import { AdvisorChatBodySchema } from './schemas';

// Mounted at /api/advisor. Any authenticated role.
export const advisorRouter = Router();
advisorRouter.post('/chat', requireAuth, asyncHandler(async (req, res) => {
  const { message, conversationId } = AdvisorChatBodySchema.parse(req.body);
  res.json(await advisorChat(message, conversationId ?? null, currentUser(req)));
}));
