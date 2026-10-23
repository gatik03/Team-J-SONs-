import { z } from 'zod';
import { CustomerSegment, KycStatus } from '@prisma/client';

export const CustomerProfileUpdateSchema = z
  .object({
    employmentType: z.string().trim().min(1).optional(),
    segment: z.nativeEnum(CustomerSegment).optional(),
    monthlyIncome: z.number().int().min(0).optional(),
    existingMonthlyObligations: z.number().int().min(0).optional(),
    location: z.string().trim().min(1).optional(),
  })
  .strict();

export type CustomerProfileUpdateInput = z.infer<typeof CustomerProfileUpdateSchema>;

export interface CustomerProfileDto {
  customerId: string;
  fullName: string;
  email: string;
  phone: string;
  segment: CustomerSegment;
  employmentType: string;
  monthlyIncome: number;
  existingMonthlyObligations: number;
  location: string;
  kycStatus: KycStatus;
  dateOfBirth: string; // YYYY-MM-DD
}

export type CustomerRecord = CustomerProfileDto & {
  kycRef: string | null;
};
