import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-n200 dark:bg-n700 rounded-sm ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
}
