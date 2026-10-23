import React from 'react';
import { HelpCircle } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon = <HelpCircle className="w-10 h-10 text-muted" />,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-surface border border-dashed border-border rounded-lg ${className}`}
    >
      <div className="mb-3 p-3 rounded-full bg-surface-2 text-muted">{icon}</div>
      {title && <h4 className="text-h3 font-semibold text-fg mb-1">{title}</h4>}
      <p className="text-sm text-muted max-w-md mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
