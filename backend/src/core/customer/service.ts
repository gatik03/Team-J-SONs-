import type { Customer } from '@prisma/client';
import { prisma } from '../../common/prisma';
import { AppError } from '../../common/errors';
import type {
  CustomerProfileDto,
  CustomerRecord,
  CustomerProfileUpdateInput,
} from './schemas';

export type {
  CustomerProfileDto,
  CustomerRecord,
  CustomerProfileUpdateInput,
};

export function toCustomerProfile(row: Customer): CustomerProfileDto {
  const dob = row.dateOfBirth.toISOString().split('T')[0];
  return {
    customerId: row.customerId,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    segment: row.segment,
    employmentType: row.employmentType,
    monthlyIncome: row.monthlyIncome,
    existingMonthlyObligations: row.existingMonthlyObligations,
    location: row.location,
    kycStatus: row.kycStatus,
    dateOfBirth: dob,
  };
}

export function toCustomerRecord(row: Customer): CustomerRecord {
  return {
    ...toCustomerProfile(row),
    kycRef: row.kycRef,
  };
}

export async function getCustomer(customerId: string): Promise<CustomerRecord> {
  const row = await prisma.customer.findUnique({
    where: { customerId },
  });
  if (!row) {
    throw new AppError(404, 'NOT_FOUND', `Customer ${customerId} not found`);
  }
  return toCustomerRecord(row);
}

export async function getProfile(customerId: string): Promise<CustomerProfileDto> {
  const record = await getCustomer(customerId);
  const { kycRef, ...profile } = record;
  return profile;
}

export async function updateProfile(
  customerId: string,
  input: CustomerProfileUpdateInput
): Promise<CustomerProfileDto> {
  const row = await prisma.customer.update({
    where: { customerId },
    data: input,
  });
  return toCustomerProfile(row);
}
