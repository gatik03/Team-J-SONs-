import type { Role } from '../../api/types';
import { Badge } from './Badge';

export interface RoleBadgeProps {
  role: Role;
  className?: string;
}

export function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  const roleConfig: Record<Role, { label: string; tone: 'neutral' | 'success' | 'warn' | 'danger' | 'info' | 'accent' }> = {
    CUSTOMER: { label: 'Customer', tone: 'info' },
    LOAN_OFFICER: { label: 'Loan Officer', tone: 'accent' },
    CREDIT_ANALYST: { label: 'Credit Analyst', tone: 'warn' },
    POLICY_ADMIN: { label: 'Policy Admin', tone: 'success' },
  };

  const config = roleConfig[role] ?? { label: role, tone: 'neutral' };

  return (
    <Badge tone={config.tone} className={className}>
      {config.label}
    </Badge>
  );
}
