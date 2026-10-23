import { usePolicyPreview } from '../../api/hooks/policyAdmin';
import { Skeleton } from '../ui/Skeleton';
import { ErrorAlert } from '../ui/ErrorAlert';

export interface PolicyPreviewProps {
  documentId: string;
}

export function PolicyPreview({ documentId }: PolicyPreviewProps) {
  const { data: sections, isLoading, error } = usePolicyPreview(documentId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorAlert error={error} />;
  }

  if (!sections || sections.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-muted border border-dashed border-border rounded-lg bg-surface">
        No sections were extracted from this file.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-fg">
        Preview — {sections.length} sections, as chunked for the assistant
      </h3>

      <div className="space-y-2">
        {sections.map((sec, idx) => (
          <details
            key={idx}
            open={idx === 0}
            className="border border-border rounded-md bg-surface overflow-hidden group"
          >
            <summary className="px-4 py-2.5 text-xs font-semibold text-fg cursor-pointer hover:bg-surface-2 transition-colors focus-ring">
              {sec.section}
            </summary>
            <div className="p-4 border-t border-border text-xs text-muted whitespace-pre-wrap leading-relaxed bg-surface-2/30">
              {sec.content}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
