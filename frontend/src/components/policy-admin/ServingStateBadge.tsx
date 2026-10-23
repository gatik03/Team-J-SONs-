import type { PolicyVersion } from '../../api/types';

export interface ServingStateBadgeProps {
  state: PolicyVersion['servingState'];
  className?: string;
}

export function ServingStateBadge({ state, className = '' }: ServingStateBadgeProps) {
  const stateConfig: Record<
    PolicyVersion['servingState'],
    { label: string; classes: string }
  > = {
    ACTIVE: { label: 'Active', classes: 'bg-success-soft text-success' },
    SCHEDULED: { label: 'Scheduled', classes: 'bg-warn-soft text-warn' },
    DRAFT: { label: 'Draft', classes: 'bg-n200 dark:bg-n700 text-n700 dark:text-n200' },
    SUPERSEDED: { label: 'Superseded', classes: 'bg-surface-2 text-muted' },
    RETIRED: { label: 'Retired', classes: 'bg-danger-soft text-danger line-through' },
  };

  const config = stateConfig[state] ?? { label: state, classes: 'bg-surface-2 text-muted' };

  return (
    <span
      className={`inline-flex items-center rounded-full text-xs font-semibold px-2.5 py-0.5 ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
}
