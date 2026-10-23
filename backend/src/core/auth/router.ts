import { Router } from 'express';
import { LoginSchema, RegistrationSchema } from './schemas';
import * as authService from './service';
import { requireAuth } from '../../common/auth';

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  try {
    res.status(201).json(await authService.register(RegistrationSchema.parse(req.body)));
  } catch (err) { next(err); }
});

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
