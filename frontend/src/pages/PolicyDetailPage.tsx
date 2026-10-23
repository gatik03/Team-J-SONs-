import { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router';
import { usePolicyVersions } from '../api/hooks/policyAdmin';
import { PolicyVersionTimeline } from '../components/policy-admin/PolicyVersionTimeline';
import { ServingStateBadge } from '../components/policy-admin/ServingStateBadge';
import { PolicyPreview } from '../components/policy-admin/PolicyPreview';
import { TestAskPanel } from '../components/policy-admin/TestAskPanel';
import { PublishDialog } from '../components/policy-admin/PublishDialog';
import { RetireDialog } from '../components/policy-admin/RetireDialog';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { Plus } from 'lucide-react';

export function PolicyDetailPage() {
  const { documentKey } = useParams<{ documentKey: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: versions, isLoading, error } = usePolicyVersions(documentKey);

  const [publishOpen, setPublishOpen] = useState(false);
  const [retireOpen, setRetireOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !versions || versions.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-h1 font-bold text-fg">Policy Detail</h1>
        {error ? <ErrorAlert error={error} /> : <p className="text-muted">Policy not found.</p>}
        <Link to="/admin/policies">
          <Button variant="secondary">Back to library</Button>
        </Link>
      </div>
    );
  }

  // Determine selected version
  const paramVersionId = searchParams.get('version');
  let selectedVersion = versions.find((v) => v.documentId === paramVersionId);

  if (!selectedVersion) {
    // Default to newest DRAFT, else ACTIVE, else first
    selectedVersion =
      versions.find((v) => v.status === 'DRAFT') ??
      versions.find((v) => v.servingState === 'ACTIVE') ??
      versions[0];
  }

  const handleSelectVersion = (id: string) => {
    setSearchParams({ version: id });
  };

  const title = versions[0]?.title ?? documentKey;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-50 bg-success-soft text-success text-sm font-semibold rounded-full px-4 py-2 shadow-pop border border-success/30"
        >
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-h1 font-bold text-fg">{title}</h1>
          </div>
          <p className="font-mono text-xs text-muted">Key: {documentKey}</p>
        </div>

        <Link to={`/admin/policies/new?documentKey=${documentKey}`}>
          <Button variant="secondary" size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            Upload new version
          </Button>
        </Link>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Column: Timeline */}
        <div className="md:col-span-1 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Version History ({versions.length})
          </h3>
          <PolicyVersionTimeline
            versions={versions}
            selectedId={selectedVersion.documentId}
            onSelect={handleSelectVersion}
          />
        </div>

        {/* Right Column: Selected Version Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-surface border border-border rounded-lg shadow-card p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-fg">
                  v{selectedVersion.version}
                </span>
                <ServingStateBadge state={selectedVersion.servingState} />
              </div>

              <div className="flex items-center gap-2">
                {selectedVersion.status === 'DRAFT' && (
                  <Button onClick={() => setPublishOpen(true)} size="sm">
                    Publish
                  </Button>
                )}

                {selectedVersion.status === 'PUBLISHED' && (
                  <Button
                    variant="secondary"
                    onClick={() => setRetireOpen(true)}
                    size="sm"
                  >
                    Retire
                  </Button>
                )}
              </div>
            </div>

            {selectedVersion.status === 'RETIRED' && (
              <p className="text-xs text-muted bg-surface-2 p-2.5 rounded-md">
                Retired versions stay for audit and cannot be republished. Upload a new version instead.
              </p>
            )}

            <div className="text-xs text-muted border-t border-border pt-3">
              <span className="font-semibold text-fg block mb-1">Change Note:</span>
              <p className="text-fg">{selectedVersion.changeNote}</p>
            </div>
          </div>

          {/* Policy Preview */}
          <PolicyPreview documentId={selectedVersion.documentId} />

          {/* Test Ask Panel */}
          <TestAskPanel version={selectedVersion} />
        </div>
      </div>

      {/* Dialogs */}
      <PublishDialog
        version={selectedVersion}
        versions={versions}
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onPublished={(v) => {
          showToast(`v${v.version} published — now ${v.servingState}`);
        }}
      />

      <RetireDialog
        version={selectedVersion}
        versions={versions}
        open={retireOpen}
        onClose={() => setRetireOpen(false)}
        onRetired={(v) => {
          showToast(`v${v.version} retired`);
        }}
      />
    </div>
  );
}
