import { Router } from 'express';
import { z } from 'zod';
import { emiResult } from './loanMath';

export const emiRouter = Router();

const EmiRequestSchema = z.object({
  principal: z.number().int().min(1),
  annualRate: z.number().min(0),
  tenureMonths: z.number().int().min(1).max(360),
});

emiRouter.post('/calculate', (req, res, next) => {
  try {
    const { principal, annualRate, tenureMonths } = EmiRequestSchema.parse(req.body);
    const result = emiResult(principal, annualRate, tenureMonths);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
