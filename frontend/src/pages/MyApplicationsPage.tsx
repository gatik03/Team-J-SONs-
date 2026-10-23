import { Link } from 'react-router';
import { useApplications } from '../api/hooks/applications';
import { useProducts } from '../api/hooks/products';
import { formatDate } from '../lib/formatDate';
import { StatusBadge } from '../components/applications/StatusBadge';
import { Money } from '../components/ui/Money';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { Plus } from 'lucide-react';

export function MyApplicationsPage() {
  const { data: apps, isLoading, error } = useApplications();
  const { data: products } = useProducts();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-fg">My Applications</h1>
          <p className="text-sm text-muted">
            Track and manage your submitted loan applications or resume draft requests.
          </p>
        </div>

        <Link to="/applications/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            New application
          </Button>
        </Link>
      </div>

      {error && <ErrorAlert error={error} />}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-5 bg-surface border border-border rounded-lg space-y-3">
              <div className="flex justify-between">
                <Skeleton className="w-32 h-5" />
                <Skeleton className="w-20 h-5" />
              </div>
              <Skeleton className="w-1/2 h-6" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && apps && apps.length === 0 && (
        <EmptyState
          title="You have no applications yet"
          description="Browse our catalogue to explore available loans and begin your application."
          action={
            <Link to="/products">
              <Button>Browse loan products</Button>
            </Link>
          }
        />
      )}

      {!isLoading && apps && apps.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {apps.map((app) => {
            const product = products?.find((p) => p.productId === app.productId);
            const isDraft = app.status === 'DRAFT';

            return (
              <div
                key={app.applicationId}
                className="bg-surface border border-border rounded-lg shadow-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/40 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-muted">
                      {app.applicationId}
                    </span>
                    <StatusBadge status={app.status} />
                  </div>

                  <h3 className="text-h3 font-bold text-fg">
                    {product?.name ?? app.productId ?? 'Draft Application'}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted pt-1">
                    <span>
                      Requested: <Money amount={app.requestedAmount} />
                    </span>
                    {app.tenureMonths && <span>Tenure: {app.tenureMonths} mos</span>}
                    {app.estimatedEmi && (
                      <span>
                        EMI: <Money amount={app.estimatedEmi} />
                      </span>
                    )}
                    <span>Updated {formatDate(app.updatedAt)}</span>
                  </div>
                </div>

                <div>
                  {isDraft ? (
                    <Link to={`/applications/${app.applicationId}/edit`}>
                      <Button size="sm">Continue</Button>
                    </Link>
                  ) : (
                    <Link to={`/applications/${app.applicationId}/status`}>
                      <Button variant="secondary" size="sm">
                        Track status
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
