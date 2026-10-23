import type { ApplicationStatus, TimelineEvent } from '../../api/types';
import { formatDateTime } from '../../lib/formatDate';
import { Check } from 'lucide-react';

export interface StatusTimelineProps {
  status: ApplicationStatus;
  timeline: TimelineEvent[];
}

const BASE_STATUS_ORDER: ApplicationStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_VERIFICATION',
  'UNDER_REVIEW',
  'APPROVED',
  'DISBURSED',
];

const LABELS: Record<ApplicationStatus, string> = {
  DRAFT: 'Draft Created',
  SUBMITTED: 'Submitted',
  UNDER_VERIFICATION: 'Under Verification',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  DISBURSED: 'Disbursed',
};

export const STATUS_STYLE: Record<ApplicationStatus, string> = {
  DRAFT: 'bg-n300',
  SUBMITTED: 'bg-primary',
  UNDER_VERIFICATION: 'bg-primary',
  UNDER_REVIEW: 'bg-primary',
  APPROVED: 'bg-success',
  REJECTED: 'bg-danger',
  DISBURSED: 'bg-success',
};

export function StatusTimeline({ status, timeline }: StatusTimelineProps) {
  const steps: ApplicationStatus[] =
    status === 'REJECTED'
      ? ['DRAFT', 'SUBMITTED', 'UNDER_VERIFICATION', 'UNDER_REVIEW', 'REJECTED']
      : BASE_STATUS_ORDER;

  const currentIdx = steps.indexOf(status);

  return (
    <ol className="relative border-l-2 border-border ml-3 my-4 space-y-6">
      {steps.map((step, idx) => {
        const isReached = idx <= currentIdx;
        const isCurrent = step === status;

        // Find relevant timeline events for this status
        const event = timeline.filter((e) => e.status === step).pop();

        return (
          <li
            key={step}
            className="ml-6"
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span
              className={`absolute -left-[11px] flex items-center justify-center w-5 h-5 rounded-full text-white text-xs ${
                isCurrent
                  ? 'bg-primary ring-4 ring-primary-soft motion-safe:animate-pulse'
                  : isReached
                  ? 'bg-primary'
                  : 'bg-n300 dark:bg-n600'
              }`}
            >
              {isReached && !isCurrent ? (
                <Check className="w-3 h-3 stroke-[3]" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-white" />
              )}
            </span>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h4
                  className={`text-sm ${
                    isCurrent
                      ? 'font-bold text-primary'
                      : isReached
                      ? 'font-semibold text-fg'
                      : 'font-normal text-muted'
                  }`}
                >
                  {LABELS[step]}
                </h4>
                {isCurrent && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary-soft text-primary">
                    Current
                  </span>
                )}
              </div>

              {event ? (
                <div className="text-xs text-muted space-y-0.5">
                  <p>{event.note}</p>
                  <p className="text-[11px] opacity-80">
                    {formatDateTime(event.at)} · by {event.by}
                  </p>
                </div>
              ) : (
                isReached && (
                  <p className="text-xs text-muted italic">Completed</p>
                )
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
