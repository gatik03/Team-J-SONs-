import type { ApplicationStatus } from '../../api/types';
import { Badge } from '../ui/Badge';

export interface StatusBadgeProps {
  status: ApplicationStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const statusConfig: Record<
    ApplicationStatus,
    { label: string; tone: 'neutral' | 'success' | 'warn' | 'danger' | 'info' | 'accent' }
  > = {
    DRAFT: { label: 'Draft', tone: 'neutral' },
    SUBMITTED: { label: 'Submitted', tone: 'info' },
    UNDER_VERIFICATION: { label: 'Under Verification', tone: 'accent' },
    UNDER_REVIEW: { label: 'Under Review', tone: 'warn' },
    APPROVED: { label: 'Approved', tone: 'success' },
    REJECTED: { label: 'Rejected', tone: 'danger' },
    DISBURSED: { label: 'Disbursed', tone: 'success' },
  };

  const config = statusConfig[status] ?? { label: status, tone: 'neutral' };

  return (
    <Badge tone={config.tone} className={className}>
      {config.label}
    </Badge>
  );
}
