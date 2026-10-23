import type { PolicySource } from '../../api/types';
import { formatDate } from '../../lib/formatDate';

export interface SourceChipProps {
  source: PolicySource;
  className?: string;
}

export function SourceChip({ source, className = '' }: SourceChipProps) {
  const fullTitle = `${source.document} · ${source.section} · v${source.version} · effective ${formatDate(
    source.effectiveDate
  )}`;

  return (
    <span
      title={fullTitle}
      className={`inline-flex items-center gap-1.5 px-2 py-1 bg-accent-soft text-accent text-xs rounded-sm font-medium border border-accent/20 max-w-full ${className}`}
    >
      <span className="truncate">
        {source.document} · {source.section}
      </span>
      <span className="flex-shrink-0 font-semibold">
        · v{source.version} · effective {formatDate(source.effectiveDate)}
      </span>
    </span>
  );
}
