import { z } from 'zod';

// Copied field-for-field from openapi AdvisorResponse (brief Module 1).
export const AdvisorRecommendationSchema = z.object({
  productId: z.string(), productName: z.string(), indicativeInterestRate: z.number(),
  tenureMonths: z.number().int(), estimatedEmi: z.number().int(), reason: z.string(),
  eligibilityIndicator: z.enum(['LIKELY_ELIGIBLE', 'BORDERLINE', 'UNLIKELY_ELIGIBLE', 'UNKNOWN']),
});
export const AdvisorResponseSchema = z.object({
  interpretedRequirement: z.string(),
  loanAmount: z.number().int().nullable(), monthlyIncome: z.number().int().nullable(), maxPreferredEmi: z.number().int().nullable(),
  currency: z.literal('INR'),
  recommendations: z.array(AdvisorRecommendationSchema),
  disclaimer: z.literal('Indicative only. Final approval is subject to credit assessment.'),
  clarifyingQuestion: z.string().nullable(),
  conversationId: z.string(),
});
export const AdvisorChatBodySchema = z.object({ message: z.string().trim().min(2).max(2000), conversationId: z.string().max(64).nullable().optional() });
export const DISCLAIMER = 'Indicative only. Final approval is subject to credit assessment.';
export type AdvisorResponse = z.infer<typeof AdvisorResponseSchema>;
export type AdvisorRecommendation = z.infer<typeof AdvisorRecommendationSchema>;
