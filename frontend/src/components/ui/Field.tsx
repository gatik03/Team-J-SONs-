import React from 'react';

export interface FieldProps {
  id?: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Field({ id, label, error, hint, required, children, className = '' }: FieldProps) {
  const errorId = id && error ? `${id}-error` : undefined;
  const hintId = id && hint ? `${id}-hint` : undefined;

  // Clone child to inject aria-invalid and aria-describedby if applicable
  const enhancedChild = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<any>, {
        id: id ?? (children.props as any).id,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': [errorId, hintId].filter(Boolean).join(' ') || undefined,
        className: `${(children.props as any).className ?? ''} ${
          error ? 'border-danger focus-visible:ring-danger' : ''
        }`,
      })
    : children;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-fg">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {enhancedChild}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-danger font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
