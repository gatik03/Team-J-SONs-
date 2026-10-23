import { z } from 'zod';
import { ApplicationStatus, DocumentType } from '@prisma/client';

export const LoanApplicationDraftSchema = z
  .object({
    productId: z.string().min(1).optional(),
    requestedAmount: z.number().int().min(1).optional(),
    tenureMonths: z.number().int().min(1).optional(),
    purpose: z.string().trim().optional(),
    employmentType: z.string().trim().optional(),
    monthlyIncome: z.number().int().min(0).optional(),
    existingMonthlyObligations: z.number().int().min(0).optional(),
    currentStep: z.number().int().min(1).max(4).optional(),
  })
  .strict();

export type LoanApplicationDraftInput = z.infer<typeof LoanApplicationDraftSchema>;

export const DecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().trim().min(10, 'reason must be at least 10 characters'),
});

export type DecisionInput = z.infer<typeof DecisionSchema>;

export const ApplicationListQuerySchema = z.object({
  status: z.nativeEnum(ApplicationStatus).optional(),
});

export type ApplicationListQueryInput = z.infer<typeof ApplicationListQuerySchema>;

export interface StatusEventDto {
  status: ApplicationStatus;
  at: string;
  by: string;
  note: string;
}

export interface ApplicationDocumentDto {
  documentId: string;
  applicationId: string;
  documentType: DocumentType;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface LoanApplicationDto {
  applicationId: string;
  customerId: string;
  productId?: string;
  requestedAmount?: number;
  tenureMonths?: number;
  purpose?: string;
  employmentType?: string;
  monthlyIncome?: number;
  existingMonthlyObligations?: number;
  currentStep?: number;
  status: ApplicationStatus;
  estimatedEmi: number | null;
  createdAt: string;
  updatedAt: string;
  timeline: StatusEventDto[];
  latestRecommendation: null;
}

export type LoanApplicationWithDocs = LoanApplicationDto & {
  documents: ApplicationDocumentDto[];
};
