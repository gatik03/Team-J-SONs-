import type { PolicyVersion } from '../../api/types';
import { formatDate, formatDateTime } from '../../lib/formatDate';
import { ServingStateBadge } from './ServingStateBadge';

export interface PolicyVersionTimelineProps {
  versions: PolicyVersion[];
  selectedId: string;
  onSelect: (documentId: string) => void;
}

export function PolicyVersionTimeline({
  versions,
  selectedId,
  onSelect,
}: PolicyVersionTimelineProps) {
  return (
    <ol className="space-y-3">
      {versions.map((v) => {
        const isSelected = v.documentId === selectedId;
        const isRetired = v.status === 'RETIRED';

        return (
          <li key={v.documentId}>
            <button
              type="button"
              onClick={() => onSelect(v.documentId)}
              aria-current={isSelected ? 'true' : undefined}
              className={`w-full text-left p-3.5 rounded-lg border transition-all cursor-pointer focus-ring space-y-2 ${
                isSelected
                  ? 'border-primary bg-primary-soft/50 ring-1 ring-primary'
                  : 'border-border bg-surface hover:bg-surface-2'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`font-mono text-sm font-bold ${
                    isRetired ? 'line-through text-muted' : 'text-fg'
                  }`}
                >
                  v{v.version}
                </span>
                <ServingStateBadge state={v.servingState} />
              </div>

              <p className="text-xs text-muted">
                Effective: <span className="text-fg font-medium">{formatDate(v.effectiveDate)}</span>
              </p>

              <p className="text-xs text-fg font-medium line-clamp-2">{v.changeNote}</p>

              <div className="pt-2 border-t border-border/60 text-[11px] text-muted space-y-0.5">
                <p>
                  Uploaded by {v.createdBy} · {formatDateTime(v.ingestedAt)}
                </p>
                {v.publishedBy && v.publishedAt && (
                  <p>
                    Published by {v.publishedBy} · {formatDateTime(v.publishedAt)}
                  </p>
                )}
                {v.retiredAt && (
                  <p className="text-danger">
                    Retired {formatDateTime(v.retiredAt)}: {v.retiredReason}
                  </p>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
