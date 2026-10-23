import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { usePolicyLibrary } from '../api/hooks/policyAdmin';
import type { PolicyVersion } from '../api/types';
import { PolicyUploadForm } from '../components/policy-admin/PolicyUploadForm';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';

export function PolicyUploadPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const defaultDocumentKey = searchParams.get('documentKey') ?? undefined;

  const { data: library, isLoading } = usePolicyLibrary();
  const [toast, setToast] = useState<string | null>(null);

  const handleCreated = (v: PolicyVersion) => {
    setToast(`Draft v${v.version} created. Preview and test it before publishing.`);
    setTimeout(() => {
      navigate(`/admin/policies/${v.documentKey}?version=${v.documentId}`);
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-h1 font-bold text-fg">Upload policy version</h1>
        <p className="text-sm text-muted">
          Upload a new document or version to the knowledge base as a draft.
        </p>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-50 bg-success-soft text-success text-sm font-semibold rounded-full px-4 py-2 shadow-pop border border-success/30"
        >
          {toast}
        </div>
      )}

      <Card>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <PolicyUploadForm
            library={library ?? []}
            defaultDocumentKey={defaultDocumentKey}
            onCreated={handleCreated}
            onCancel={() => navigate('/admin/policies')}
          />
        )}
      </Card>
    </div>
  );
}
