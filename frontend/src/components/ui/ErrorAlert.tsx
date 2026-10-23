import { AlertCircle } from 'lucide-react';
import { ApiError } from '../../api/client';

export interface ErrorAlertProps {
  error: unknown;
  className?: string;
}

export function ErrorAlert({ error, className = '' }: ErrorAlertProps) {
  if (!error) return null;

  let message = 'An unexpected error occurred.';
  let code: string | undefined;

  if (error instanceof ApiError) {
    message = error.body.message || error.message;
    code = error.body.code;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-3.5 rounded-md bg-danger-soft border border-danger/20 text-danger text-sm ${className}`}
    >
      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-danger" />
      <div className="flex-1">
        <p className="font-medium">{message}</p>
        {code && <p className="text-xs opacity-80 mt-0.5 font-mono">Code: {code}</p>}
      </div>
    </div>
  );
}
