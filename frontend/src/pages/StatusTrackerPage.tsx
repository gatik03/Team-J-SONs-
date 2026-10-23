import { useParams, Link } from 'react-router';
import { useApplication } from '../api/hooks/applications';
import { useRecommendation } from '../api/hooks/workflow';
import { useProducts } from '../api/hooks/products';
import { StatusTimeline } from '../components/applications/StatusTimeline';
import { StatusBadge } from '../components/applications/StatusBadge';
import { Money } from '../components/ui/Money';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { Button } from '../components/ui/Button';
import { AlertCircle, FileText } from 'lucide-react';

export function StatusTrackerPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const { data: application, isLoading, error } = useApplication(applicationId);
  const { data: recommendation } = useRecommendation(applicationId);
  const { data: products } = useProducts();

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-h1 font-bold text-fg">Application Status</h1>
        {error ? <ErrorAlert error={error} /> : <p className="text-muted">Application not found.</p>}
        <Link to="/applications">
          <Button variant="secondary">Back to my applications</Button>
        </Link>
      </div>
    );
  }

  const product = products?.find((p) => p.productId === application.productId);

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-h1 font-bold text-fg">Status Tracker</h1>
            <StatusBadge status={application.status} />
          </div>
          <span className="text-xs font-mono text-muted">Application ID: {application.applicationId}</span>
        </div>

        <Link to="/applications">
          <Button variant="secondary" size="sm">
            All applications
          </Button>
        </Link>
      </div>

      {/* Summary Card */}
      <div className="bg-surface border border-border rounded-lg shadow-card p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
          Application Details
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-xs text-muted block">Loan Product</span>
            <span className="font-semibold text-fg">
              {product?.name ?? application.productId ?? '—'}
            </span>
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
      </div>

      {/* Customer Next Steps Card (Customer View) */}
      {recommendation && (
        <div className="bg-surface border border-accent/30 rounded-lg shadow-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-accent font-semibold text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>Next Steps for Your Application</span>
          </div>

          {recommendation.customerMessage && (
            <p className="text-sm text-fg bg-surface-2 p-3.5 rounded-md border border-border">
              {recommendation.customerMessage}
            </p>
          )}

          {recommendation.missingDocuments && recommendation.missingDocuments.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                Action Required: Outstanding Documents
              </span>
              <ul className="space-y-1 text-xs">
                {recommendation.missingDocuments.map((doc, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-fg">
                    <FileText className="w-4 h-4 text-warn" />
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Verification Timeline */}
      <div className="bg-surface border border-border rounded-lg shadow-card p-6 space-y-4">
        <h3 className="text-h3 font-bold text-fg">Application Progress</h3>
        <StatusTimeline
          status={application.status}
          timeline={application.timeline ?? []}
        />
      </div>
    </div>
  );
}
