import { Router } from 'express';
import { requireAuth, requireRole } from '../../common/auth';
import { AppError } from '../../common/errors';
import { CustomerProfileUpdateSchema } from './schemas';
import * as customerService from './service';

export const customerRouter = Router();

// Staff (LOAN_OFFICER, CREDIT_ANALYST, POLICY_ADMIN) are not CUSTOMER, so requireRole('CUSTOMER') blocks them with 403
customerRouter.use(requireAuth, requireRole('CUSTOMER'));

customerRouter.get('/me', async (req, res, next) => {
  try {
    const customerId = req.user?.customerId;
    if (!customerId) {
      throw new AppError(401, 'UNAUTHORIZED', 'Customer profile not found for user');
    }
    const profile = await customerService.getProfile(customerId);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

customerRouter.put('/me', async (req, res, next) => {
  try {
    const customerId = req.user?.customerId;
    if (!customerId) {
      throw new AppError(401, 'UNAUTHORIZED', 'Customer profile not found for user');
    }
    const input = CustomerProfileUpdateSchema.parse(req.body);
    const updated = await customerService.updateProfile(customerId, input);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});
