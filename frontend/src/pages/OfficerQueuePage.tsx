import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useApplications } from '../api/hooks/applications';
import { useRunWorkflow } from '../api/hooks/workflow';
import { useProducts } from '../api/hooks/products';
import type { ApplicationStatus } from '../api/types';
import { StatusBadge } from '../components/applications/StatusBadge';
import { Money } from '../components/ui/Money';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { formatDate } from '../lib/formatDate';
import { Play } from 'lucide-react';

export function OfficerQueuePage() {
  const [statusFilter, setStatusFilter] = useState<string>('SUBMITTED_AND_ABOVE');
  const [demoPermissionViolation, setDemoPermissionViolation] = useState(false);
  const [runningAppId, setRunningAppId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);

  const navigate = useNavigate();

  const isSpecificStatus =
    statusFilter !== 'SUBMITTED_AND_ABOVE' && statusFilter !== 'ALL';
  const { data: apps, isLoading, error } = useApplications(
    isSpecificStatus ? (statusFilter as ApplicationStatus) : undefined
  );
  const { data: products } = useProducts();

  const runWorkflowMutation = useRunWorkflow(runningAppId ?? undefined);

  let displayedApps = apps ?? [];
  if (statusFilter === 'SUBMITTED_AND_ABOVE') {
    displayedApps = displayedApps.filter((a) => a.status !== 'DRAFT');
  }

  const handleRunWorkflow = async (appId: string) => {
    setRunningAppId(appId);
    setActionError(null);

    try {
      await runWorkflowMutation.mutateAsync({ demoPermissionViolation });
      navigate(`/analyst/review/${appId}`);
    } catch (err) {
      setActionError(err);
    } finally {
      setRunningAppId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-fg">Officer Review Queue</h1>
          <p className="text-sm text-muted">
            Process submitted loan applications and trigger agentic pre-screening checks.
          </p>
        </div>

        {/* Demo permission violation switch */}
        <label className="flex items-center gap-2 p-2 rounded-md bg-surface border border-border text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={demoPermissionViolation}
            onChange={(e) => setDemoPermissionViolation(e.target.checked)}
            className="rounded border-border text-primary focus-ring"
          />
          <div>
            <span className="font-semibold text-fg">Demo: show permission refusal</span>
            <span className="block text-[11px] text-muted">
              Forces orchestrator to attempt forbidden tool call
            </span>
          </div>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <label htmlFor="queue-status-filter" className="text-xs font-medium text-fg">
          Filter status:
        </label>
        <select
          id="queue-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs px-2.5 py-1.5 rounded-md border border-border bg-surface text-fg focus-ring"
        >
          <option value="SUBMITTED_AND_ABOVE">All submitted & active</option>
          <option value="SUBMITTED">Submitted only</option>
          <option value="UNDER_VERIFICATION">Under Verification</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="ALL">All including drafts</option>
        </select>
      </div>

      {Boolean(actionError) && <ErrorAlert error={actionError} />}
      {error && <ErrorAlert error={error} />}

      {isLoading && (
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <Skeleton className="w-1/4 h-6" />
          <Skeleton className="w-full h-48" />
        </div>
      )}

      {!isLoading && displayedApps.length === 0 && (
        <EmptyState
          title="No submitted applications"
          description="There are currently no applications matching this queue filter."
        />
      )}

      {!isLoading && displayedApps.length > 0 && (
        <div className="bg-surface border border-border rounded-lg shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-surface-2 border-b border-border">
                <tr>
                  <th className="p-3.5 font-semibold text-fg">Application</th>
                  <th className="p-3.5 font-semibold text-fg">Customer</th>
                  <th className="p-3.5 font-semibold text-fg">Product</th>
                  <th className="p-3.5 font-semibold text-fg">Amount</th>
                  <th className="p-3.5 font-semibold text-fg">Status</th>
                  <th className="p-3.5 font-semibold text-fg">Updated</th>
                  <th className="p-3.5 font-semibold text-fg text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayedApps.map((app) => {
                  const product = products?.find((p) => p.productId === app.productId);
                  const isSubmitted = app.status === 'SUBMITTED';
                  const isRunningThis = runningAppId === app.applicationId;

                  return (
                    <tr key={app.applicationId} className="hover:bg-surface-2/40 transition-colors">
                      <td className="p-3.5 font-mono text-xs font-semibold text-primary">
                        {app.applicationId}
                      </td>
                      <td className="p-3.5 font-mono text-xs text-muted">
                        {app.customerId}
                      </td>
                      <td className="p-3.5 text-fg font-medium">
                        {product?.name ?? app.productId ?? '—'}
                      </td>
                      <td className="p-3.5 font-medium">
                        <Money amount={app.requestedAmount} />
                      </td>
                      <td className="p-3.5">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="p-3.5 text-xs text-muted">
                        {formatDate(app.updatedAt)}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isSubmitted && (
                            <Button
                              size="sm"
                              onClick={() => handleRunWorkflow(app.applicationId)}
                              loading={isRunningThis}
                              className="gap-1"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              Run AI pre-screen
                            </Button>
                          )}
                          <Link to={`/analyst/review/${app.applicationId}`}>
                            <Button variant="secondary" size="sm">
                              Open review
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
