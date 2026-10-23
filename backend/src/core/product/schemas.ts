import { z } from 'zod';
import { LoanType, CustomerSegment } from '@prisma/client';

export const ProductQuerySchema = z.object({
  q: z.string().trim().optional(),
  loanType: z.nativeEnum(LoanType).optional(),
  segment: z.nativeEnum(CustomerSegment).optional(),
  minAmount: z.coerce.number().int().min(0).optional(),
  maxAmount: z.coerce.number().int().min(0).optional(),
  sort: z
    .enum([
      'rate_asc',
      'rate_desc',
      'amount_asc',
      'amount_desc',
      'tenure_asc',
      'tenure_desc',
      'name',
    ])
    .optional(),
});

export type ProductQueryInput = z.infer<typeof ProductQuerySchema>;

export const CompareQuerySchema = z.object({
  ids: z
    .string()
    .transform((val) => {
      const parts = val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return Array.from(new Set(parts));
    })
    .refine((ids) => ids.length >= 2 && ids.length <= 4, {
      message: 'ids must list 2 to 4 product IDs',
    }),
});

export interface EligibilityCriteriaDto {
  minMonthlyIncome: number;
  minCreditScore: number;
  maxObligationRatioPercent: number;
  allowedSegments: CustomerSegment[];
  minAgeYears: number;
  maxAgeYears: number;
}

export interface LoanProductDto {
  productId: string;
  name: string;
  loanType: LoanType;
  description: string;
  minInterestRate: number;
  maxInterestRate: number;
  minTenureMonths: number;
  maxTenureMonths: number;
  minAmount: number;
  maxAmount: number;
  processingFeePercent: number;
  processingFeeMin: number;
  eligibilityCriteria: EligibilityCriteriaDto;
}

export type LoanProductRecord = LoanProductDto & {
  indicativeRate: number;
  processingFeeMax: number | null;
};
