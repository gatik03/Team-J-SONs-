import React from 'react';
import { formatInr } from '../../lib/formatInr';

export interface MoneyProps extends React.HTMLAttributes<HTMLSpanElement> {
  amount: number | null | undefined;
}

export function Money({ amount, className = '', ...props }: MoneyProps) {
  if (amount === null || amount === undefined) {
    return <span className={`tabular-nums text-muted ${className}`}>—</span>;
  }
  return (
    <span className={`tabular-nums font-medium ${className}`} {...props}>
      {formatInr(amount)}
    </span>
  );
}
