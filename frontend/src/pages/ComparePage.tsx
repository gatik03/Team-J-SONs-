import { Link, useSearchParams } from 'react-router';
import { useCompareProducts } from '../api/hooks/products';
import { CompareTable } from '../components/products/CompareTable';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';

export function ComparePage() {
  const [searchParams] = useSearchParams();
  const rawIds = searchParams.get('ids') ?? '';
  const ids = rawIds.split(',').filter(Boolean);

  const { data: products, isLoading, error } = useCompareProducts(ids);

  if (ids.length < 2 || ids.length > 4) {
    return (
      <div className="space-y-6">
        <h1 className="text-h1 font-bold text-fg">Compare Products</h1>
        <EmptyState
          title="Pick 2 to 4 products in the catalogue"
          description="Select products in the catalogue using the Compare checkbox to view their rates, fees, and eligibility side-by-side."
          action={
            <Link to="/products">
              <Button>Go to catalogue</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-fg">Compare Products</h1>
          <p className="text-sm text-muted">
            Side-by-side comparison of {ids.length} selected loan products.
          </p>
        </div>
        <Link to="/products">
          <Button variant="secondary" size="sm">
            Back to catalogue
          </Button>
        </Link>
      </div>

      {error && <ErrorAlert error={error} />}

      {isLoading && (
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <Skeleton className="w-1/3 h-8" />
          <Skeleton className="w-full h-64" />
        </div>
      )}

      {!isLoading && products && products.length >= 2 && (
        <CompareTable products={products} />
      )}
    </div>
  );
}
