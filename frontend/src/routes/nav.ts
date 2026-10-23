import type { Role } from '../api/types';

export const navByRole: Record<Role, { label: string; to: string }[]> = {
  CUSTOMER: [
    { label: 'Products', to: '/products' },
    { label: 'EMI calculator', to: '/emi' },
    { label: 'Advisor', to: '/advisor' },
    { label: 'Policy assistant', to: '/policy' },
    { label: 'My applications', to: '/applications' },
    { label: 'Profile', to: '/profile' },
  ],
  LOAN_OFFICER: [
    { label: 'Queue', to: '/officer/queue' },
    { label: 'Policy assistant', to: '/policy' },
    { label: 'Policies in force', to: '/knowledge' },
    { label: 'Products', to: '/products' },
  ],
  CREDIT_ANALYST: [
    { label: 'Review queue', to: '/officer/queue' },
    { label: 'Policy assistant', to: '/policy' },
    { label: 'Policies in force', to: '/knowledge' },
    { label: 'Products', to: '/products' },
  ],
  POLICY_ADMIN: [
    { label: 'Policy library', to: '/admin/policies' },
    { label: 'Policy assistant', to: '/policy' },
  ],
};
