import { z } from 'zod';

// Field-for-field from openapi PolicyAnswer.
export const PolicyAnswerSchema = z.object({
  answer: z.string(),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  sources: z.array(z.object({ document: z.string(), section: z.string(), version: z.string(), effectiveDate: z.string() })),
  followUpRequired: z.boolean(),
});
export type PolicyAnswer = z.infer<typeof PolicyAnswerSchema>;

export const PolicyAskBodySchema = z.object({
  question: z.string().trim().min(3).max(1000),
  loanType: z.enum(['PERSONAL', 'HOME', 'VEHICLE', 'EDUCATION', 'ALL']).optional(),
  customerSegment: z.enum(['SALARIED', 'SELF_EMPLOYED', 'STUDENT', 'ALL']).optional(),
});

export const SAFE_ANSWER: PolicyAnswer = {
  answer: "I couldn't find this in Kestrel Bank's approved documents. Please contact your loan officer or the call centre.",
  confidence: 'LOW', sources: [], followUpRequired: true,
};

export const GroundedSchema = z.object({   // what the LLM returns — it never writes sources
  answer: z.string(), confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  usedChunkIds: z.array(z.string()), followUpRequired: z.boolean(),
});
