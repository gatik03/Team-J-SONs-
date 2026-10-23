import React from 'react';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
}

export function Card({ title, subtitle, actions, footer, children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-surface border border-border rounded-lg shadow-card overflow-hidden ${className}`}
      {...props}
    >
      {(title || actions) && (
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4">
          <div>
            {title && <h3 className="text-h3 font-semibold text-fg">{title}</h3>}
            {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
      {footer && <div className="px-5 py-3 border-t border-border bg-surface-2">{footer}</div>}
    </div>
  );
}
