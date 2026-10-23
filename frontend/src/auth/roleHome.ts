import type { Role } from '../api/types';

export function roleHome(role: Role): string {
  switch (role) {
    case 'CUSTOMER':
      return '/products';
    case 'LOAN_OFFICER':
    case 'CREDIT_ANALYST':
      return '/officer/queue';
    case 'POLICY_ADMIN':
      return '/admin/policies';
    default:
      return '/products';
  }
}
