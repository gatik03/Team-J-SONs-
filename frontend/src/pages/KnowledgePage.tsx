import { useKnowledgeDocuments } from '../api/hooks/knowledge';
import { KnowledgeTable } from '../components/knowledge/KnowledgeTable';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorAlert } from '../components/ui/ErrorAlert';

export function KnowledgePage() {
  const { data: docs, isLoading, error } = useKnowledgeDocuments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 font-bold text-fg">Policies in force</h1>
        <p className="text-sm text-muted">
          Managed by the Policy Admin. These are the versions the policy assistant serves today.
        </p>
      </div>

      {error && <ErrorAlert error={error} />}

      {isLoading && (
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <Skeleton className="w-1/4 h-6" />
          <Skeleton className="w-full h-48" />
        </div>
      )}

      {!isLoading && docs && docs.length === 0 && (
        <EmptyState
          title="No policies in force"
          description="There are currently no active policies published in the system."
        />
      )}

      {!isLoading && docs && docs.length > 0 && (
        <KnowledgeTable docs={docs} />
      )}
    </div>
  );
}
