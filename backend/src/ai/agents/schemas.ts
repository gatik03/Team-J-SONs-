import { z } from 'zod';

// Copied field-for-field from openapi AgentRecommendation (brief Module 3).
export const AgentNameSchema = z.enum(['DocumentVerificationAgent', 'CreditAssessmentAgent', 'ComplianceAgent', 'CustomerCommunicationAgent', 'OrchestratorAgent']);
export const AgentRecommendationSchema = z.object({
  applicationId: z.string(),
  recommendation: z.enum(['RECOMMEND_APPROVE', 'RECOMMEND_REJECT', 'REQUEST_ADDITIONAL_DOCUMENTS', 'REFER_TO_HUMAN']),
  riskBand: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  checks: z.array(z.object({ agent: AgentNameSchema, result: z.enum(['PASS', 'FAIL', 'INCOMPLETE', 'EXCEPTION']), detail: z.string() })),
  missingDocuments: z.array(z.string()),
  customerMessage: z.string(),
  requiresHumanApproval: z.boolean(),
  auditTrailId: z.string(),
});
export type AgentRecommendation = z.infer<typeof AgentRecommendationSchema>;
