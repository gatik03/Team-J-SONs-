import { Link } from 'react-router';
import { usePolicyLibrary } from '../api/hooks/policyAdmin';
import { PolicyLibraryTable } from '../components/policy-admin/PolicyLibraryTable';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { Plus } from 'lucide-react';

export function PolicyLibraryPage() {
  const { data: library, isLoading, error } = usePolicyLibrary();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-fg">Policy library</h1>
          <p className="text-sm text-muted">
            Manage versioned policy documents, schedule releases, preview chunked sections, and control versions in force.
          </p>
        </div>

        <Link to="/admin/policies/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            New policy
          </Button>
        </Link>
      </div>

      {error && <ErrorAlert error={error} />}

      {isLoading && (
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <Skeleton className="w-1/4 h-6" />
          <Skeleton className="w-full h-48" />
        </div>
      )}

      {!isLoading && library && library.length === 0 && (
        <EmptyState
          title="No policies yet"
          description="Upload the first policy document version to configure your RAG assistant knowledge base."
          action={
            <Link to="/admin/policies/new">
              <Button>New policy</Button>
            </Link>
          }
        />
      )}

      {!isLoading && library && library.length > 0 && (
        <PolicyLibraryTable items={library} />
      )}
    </div>
  );
}
