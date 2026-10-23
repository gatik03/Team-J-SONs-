import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-ring';

  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-hover shadow-card',
    secondary: 'bg-surface text-fg border border-border hover:bg-surface-2 active:bg-surface-2 shadow-card',
    ghost: 'bg-transparent text-fg hover:bg-surface-2 active:bg-surface-2',
    danger: 'bg-danger text-white hover:opacity-90 active:opacity-80 shadow-card',
    link: 'bg-transparent text-primary hover:underline p-0 h-auto shadow-none',
  };

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 rounded-sm gap-1.5',
    md: 'text-sm px-3.5 py-2 rounded-md gap-2',
    lg: 'text-body px-5 py-2.5 rounded-md gap-2.5',
  };

  const appliedSize = variant === 'link' ? '' : sizeClasses[size];

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${appliedSize} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
      {children}
    </button>
  );
}
