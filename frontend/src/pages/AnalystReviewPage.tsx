import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useApplication } from '../api/hooks/applications';
import { useDocuments } from '../api/hooks/documents';
import { useRecommendation, useRunWorkflow } from '../api/hooks/workflow';
import { useAuditTrail } from '../api/hooks/audit';
import { useProducts } from '../api/hooks/products';
import { StatusBadge } from '../components/applications/StatusBadge';
import { StatusTimeline } from '../components/applications/StatusTimeline';
import { AgentChecksTable } from '../components/review/AgentChecksTable';
import { AuditTrailViewer } from '../components/review/AuditTrailViewer';
import { DecisionForm } from '../components/review/DecisionForm';
import { Money } from '../components/ui/Money';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { Lock, FileCheck, Play } from 'lucide-react';

export function AnalystReviewPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [demoPermissionViolation, setDemoPermissionViolation] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);

  const { data: application, isLoading: isAppLoading, error: appError } = useApplication(applicationId);
  const { data: documents } = useDocuments(applicationId);
  const { data: recommendation, isLoading: isRecLoading } = useRecommendation(applicationId);
  const { data: auditTrail } = useAuditTrail(recommendation?.auditTrailId);
  const { data: products } = useProducts();

  const runWorkflowMutation = useRunWorkflow(applicationId);

  const handleRunWorkflow = async () => {
    setActionError(null);
    try {
      await runWorkflowMutation.mutateAsync({ demoPermissionViolation });
    } catch (err) {
      setActionError(err);
    }
  };

  if (isAppLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (appError || !application) {
    return (
      <div className="space-y-4">
        <h1 className="text-h1 font-bold text-fg">Review Application</h1>
        {appError ? <ErrorAlert error={appError} /> : <p className="text-muted">Application not found.</p>}
        <Link to="/officer/queue">
          <Button variant="secondary">Back to queue</Button>
        </Link>
      </div>
    );
  }

  const product = products?.find((p) => p.productId === application.productId);

  return (
    <div className="space-y-6">
      {/* Header & Application Summary */}
      <div className="bg-surface border border-border rounded-lg shadow-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-h1 font-bold text-fg">Application Review</h1>
              <StatusBadge status={application.status} />
            </div>
            <p className="text-xs font-mono text-muted">
              Application ID: {application.applicationId} · Customer: {application.customerId}
            </p>
          </div>

          <Link to="/officer/queue">
            <Button variant="secondary" size="sm">
              Back to queue
            </Button>
          </Link>
        </div>

        {Boolean(actionError) && <ErrorAlert error={actionError} />}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border text-sm">
          <div>
            <span className="text-xs text-muted block">Product</span>
            <span className="font-semibold text-fg">{product?.name ?? application.productId}</span>
          </div>

          <div>
            <span className="text-xs text-muted block">Requested Amount</span>
            <span className="font-semibold text-fg">
              <Money amount={application.requestedAmount} />
            </span>
          </div>

          <div>
            <span className="text-xs text-muted block">Tenure</span>
            <span className="font-semibold text-fg">{application.tenureMonths ?? '—'} months</span>
          </div>

          <div>
            <span className="text-xs text-muted block">Estimated Monthly EMI</span>
            <span className="font-bold text-primary">
              <Money amount={application.estimatedEmi} />
            </span>
          </div>
        </div>

        {/* Uploaded Documents */}
        <div className="pt-3 border-t border-border">
          <span className="text-xs font-semibold text-muted block mb-2">
            Uploaded Verification Documents ({documents?.length ?? 0})
          </span>
          {documents && documents.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {documents.map((doc) => (
                <div
                  key={doc.documentId}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-2 border border-border text-xs"
                >
                  <FileCheck className="w-3.5 h-3.5 text-success" />
                  <span className="font-medium text-fg">{doc.fileName}</span>
                  <span className="text-muted text-[11px]">({doc.documentType})</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted">No documents uploaded.</span>
          )}
        </div>
      </div>

      {/* Main Review Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left Column: AI Checks & Audit Trail */}
        <div className="xl:col-span-2 space-y-6">
          {/* AI Pre-Screen Checks */}
          <div className="bg-surface border border-border rounded-lg shadow-card p-6 space-y-4">
            <h2 className="text-h2 font-bold text-fg">Agentic Pre-Screen Checks</h2>

            {isRecLoading && (
              <div className="space-y-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-40 w-full" />
              </div>
            )}

            {!isRecLoading && !recommendation && (
              <EmptyState
                title="No AI pre-screen yet"
                description="Run the orchestrator workflow to perform automated document verification, credit assessment, and compliance checks."
                action={
                  application.status === 'SUBMITTED' ? (
                    <div className="space-y-3">
                      <label className="flex items-center justify-center gap-2 text-xs text-muted cursor-pointer">
                        <input
                          type="checkbox"
                          checked={demoPermissionViolation}
                          onChange={(e) => setDemoPermissionViolation(e.target.checked)}
                          className="rounded border-border text-primary focus-ring"
                        />
                        <span>Demo: show permission refusal</span>
                      </label>
                      <Button
                        onClick={handleRunWorkflow}
                        loading={runWorkflowMutation.isPending}
                        className="gap-2"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        Run AI pre-screen
                      </Button>
                    </div>
                  ) : undefined
                }
              />
            )}

            {!isRecLoading && recommendation && (
              <div className="space-y-4">
                {recommendation.requiresHumanApproval && (
                  <div
                    role="status"
                    className="flex items-center gap-3 p-3.5 rounded-lg bg-accent-soft border border-accent/30 text-accent font-semibold text-xs"
                  >
                    <Lock className="w-5 h-5 flex-shrink-0" />
                    <span>
                      Human decision required — the AI only recommends. The final decision is yours.
                    </span>
                  </div>
                )}

                <AgentChecksTable rec={recommendation} />
              </div>
            )}
          </div>

          {/* Audit Trail Viewer */}
          {recommendation && (
            <div className="bg-surface border border-border rounded-lg shadow-card p-6 space-y-4">
              <h2 className="text-h2 font-bold text-fg">Execution Audit Trail</h2>
              <AuditTrailViewer trail={auditTrail} />
            </div>
          )}
        </div>

        {/* Right Column: Decision Form & Timeline */}
        <div className="space-y-6 xl:sticky xl:top-20">
          <div className="bg-surface border border-border rounded-lg shadow-card p-5">
            <DecisionForm
              applicationId={application.applicationId}
              status={application.status}
            />
          </div>

          <div className="bg-surface border border-border rounded-lg shadow-card p-5 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Status Timeline
            </h4>
            <StatusTimeline
              status={application.status}
              timeline={application.timeline ?? []}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
