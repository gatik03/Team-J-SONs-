import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useDecision } from '../../api/hooks/applications';
import type { ApplicationStatus } from '../../api/types';
import { Button } from '../ui/Button';
import { ErrorAlert } from '../ui/ErrorAlert';
import { ShieldAlert } from 'lucide-react';

export interface DecisionFormProps {
  applicationId: string;
  status: ApplicationStatus;
  onDecided?: () => void;
}

const MIN_REASON = 10;

export function DecisionForm({ applicationId, status, onDecided }: DecisionFormProps) {
  const { user } = useAuth();
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reason, setReason] = useState('');
  const decisionMutation = useDecision(applicationId);

  const isCreditAnalyst = user?.role === 'CREDIT_ANALYST';
  const isUnderReview = status === 'UNDER_REVIEW';

  if (!isCreditAnalyst) {
    return (
      <div className="p-4 bg-surface-2 rounded-lg border border-border text-xs text-muted flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-warn flex-shrink-0" />
        <span>Only a Credit Analyst can record the formal credit decision.</span>
      </div>
    );
  }

  if (!isUnderReview) {
    return (
      <div className="p-4 bg-surface-2 rounded-lg border border-border text-xs text-muted">
        Decision recording is enabled only when the application is in <span className="font-semibold text-fg">UNDER_REVIEW</span> status. Current status: <span className="font-semibold text-fg">{status}</span>.
      </div>
    );
  }

  const trimmedReason = reason.trim();
  const isValidReason = trimmedReason.length >= MIN_REASON;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidReason) return;

    decisionMutation.mutate(
      { decision, reason: trimmedReason },
      {
        onSuccess: () => {
          setReason('');
          if (onDecided) onDecided();
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-bold text-fg uppercase tracking-wider">
        Record Credit Decision
      </h3>

      {decisionMutation.error && <ErrorAlert error={decisionMutation.error} />}

      <div className="space-y-2">
        <span className="block text-xs font-medium text-fg">Decision outcome</span>
        <div className="grid grid-cols-2 gap-3">
          <label
            className={`flex items-center justify-center p-3 rounded-md border text-xs font-semibold cursor-pointer transition-colors focus-ring ${
              decision === 'APPROVED'
                ? 'bg-success-soft border-success text-success'
                : 'bg-surface border-border text-muted hover:bg-surface-2'
            }`}
          >
            <input
              type="radio"
              name="decision"
              value="APPROVED"
              checked={decision === 'APPROVED'}
              onChange={() => setDecision('APPROVED')}
              className="sr-only"
            />
            Approve Application
          </label>

          <label
            className={`flex items-center justify-center p-3 rounded-md border text-xs font-semibold cursor-pointer transition-colors focus-ring ${
              decision === 'REJECTED'
                ? 'bg-danger-soft border-danger text-danger'
                : 'bg-surface border-border text-muted hover:bg-surface-2'
            }`}
          >
            <input
              type="radio"
              name="decision"
              value="REJECTED"
              checked={decision === 'REJECTED'}
              onChange={() => setDecision('REJECTED')}
              className="sr-only"
            />
            Reject Application
          </label>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <label htmlFor="decision-reason" className="font-medium text-fg">
            Reason (required, at least 10 characters)
          </label>
          <span className={trimmedReason.length < MIN_REASON ? 'text-warn' : 'text-success'}>
            {trimmedReason.length}/{MIN_REASON} chars
          </span>
        </div>
        <textarea
          id="decision-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Income verified, obligation ratio within policy limit of 50%."
          className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-xs resize-none"
          required
        />
      </div>

      <div className="pt-2">
        {decision === 'APPROVED' ? (
          <Button
            type="submit"
            className="w-full"
            disabled={!isValidReason || decisionMutation.isPending}
            loading={decisionMutation.isPending}
          >
            Approve
          </Button>
        ) : (
          <Button
            type="submit"
            variant="danger"
            className="w-full"
            disabled={!isValidReason || decisionMutation.isPending}
            loading={decisionMutation.isPending}
          >
            Reject
          </Button>
        )}
      </div>
    </form>
  );
}
