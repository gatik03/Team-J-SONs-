import { Router } from 'express';
import { LoginSchema } from './schemas';
import * as authService from './service';
import { requireAuth } from '../../common/auth';

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const input = LoginSchema.parse(req.body);
    const result = await authService.login(input);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, (req, res) => {
  const user = req.user!;
  res.json({
    username: user.username,
    role: user.role,
    customerId: user.customerId,
  });
});
