import type { ApplicationStatus } from '@prisma/client';
import { AppError } from '../../common/errors';

export const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_VERIFICATION'],
  UNDER_VERIFICATION: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['DISBURSED'],
  REJECTED: [],
  DISBURSED: [],
};

export function canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: ApplicationStatus, to: ApplicationStatus): void {
  if (!canTransition(from, to)) {
    throw new AppError(409, 'INVALID_STATE', `Cannot move application from ${from} to ${to}`);
  }
}
