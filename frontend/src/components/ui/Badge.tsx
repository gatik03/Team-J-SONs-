import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'success' | 'warn' | 'danger' | 'info' | 'accent';
  children: React.ReactNode;
}

export function Badge({ tone = 'neutral', children, className = '', ...props }: BadgeProps) {
  const toneClasses = {
    neutral: 'bg-n200 text-n700',
    success: 'bg-success-soft text-success',
    warn: 'bg-warn-soft text-warn',
    danger: 'bg-danger-soft text-danger',
    info: 'bg-info-soft text-info',
    accent: 'bg-accent-soft text-accent',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${toneClasses[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
