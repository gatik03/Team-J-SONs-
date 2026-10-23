import { Link, useParams } from 'react-router';
import { useProduct } from '../api/hooks/products';
import { useAuth } from '../auth/AuthContext';
import { formatPercent } from '../lib/formatInr';
import { Badge } from '../components/ui/Badge';
import { Money } from '../components/ui/Money';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { EmiCalculator } from '../components/emi/EmiCalculator';

export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const { user } = useAuth();
  const { data: product, isLoading, error } = useProduct(productId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="space-y-4">
        <h1 className="text-h1 font-bold text-fg">Product Detail</h1>
        {error ? <ErrorAlert error={error} /> : <p className="text-muted">Product not found.</p>}
        <Link to="/products">
          <Button variant="secondary">Back to catalogue</Button>
        </Link>
      </div>
    );
  }

  const defaultPrincipal = Math.max(
    product.minAmount,
    Math.min(500000, product.maxAmount)
  );
  const defaultTenure = Math.max(
    product.minTenureMonths,
    Math.min(60, product.maxTenureMonths)
  );

  return (
    <div className="space-y-8">
      {/* Product Overview Header */}
      <div className="bg-surface border border-border rounded-lg shadow-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge tone="accent">{product.loanType}</Badge>
              <span className="text-xs text-muted font-mono">{product.productId}</span>
            </div>
            <h1 className="text-h1 font-bold text-fg">{product.name}</h1>
            {product.description && (
              <p className="text-muted mt-1 max-w-2xl">{product.description}</p>
            )}
          </div>

          {user?.role === 'CUSTOMER' && (
            <Link to={`/applications/new?productId=${product.productId}`}>
              <Button size="lg" className="w-full sm:w-auto">
                Apply for this loan
              </Button>
            </Link>
          )}
        </div>

        {/* Facts Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
          <div>
            <span className="text-xs text-muted block">Interest rate range</span>
            <span className="text-sm font-semibold text-fg">
              {formatPercent(product.minInterestRate)} – {formatPercent(product.maxInterestRate)} p.a.
            </span>
          </div>

          <div>
            <span className="text-xs text-muted block">Tenure range</span>
            <span className="text-sm font-semibold text-fg">
              {product.minTenureMonths} – {product.maxTenureMonths} months
            </span>
          </div>

          <div>
            <span className="text-xs text-muted block">Loan amount</span>
            <span className="text-sm font-semibold text-fg">
              <Money amount={product.minAmount} /> – <Money amount={product.maxAmount} />
            </span>
          </div>

          <div>
            <span className="text-xs text-muted block">Processing fee</span>
            <span className="text-sm font-semibold text-fg">
              {formatPercent(product.processingFeePercent)}
              {product.processingFeeMin ? ` (min ₹${product.processingFeeMin.toLocaleString('en-IN')})` : ''}
            </span>
          </div>
        </div>

        {/* Eligibility Criteria */}
        <div className="pt-4 border-t border-border">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
            Eligibility Requirements
          </h4>
          <div className="flex flex-wrap gap-2 text-xs">
            {product.eligibilityCriteria.minMonthlyIncome !== undefined && (
              <span className="px-2.5 py-1 rounded bg-surface-2 text-fg">
                Min income: <Money amount={product.eligibilityCriteria.minMonthlyIncome} />/mo
              </span>
            )}
            {product.eligibilityCriteria.minCreditScore !== undefined && (
              <span className="px-2.5 py-1 rounded bg-surface-2 text-fg">
                Min credit score: {product.eligibilityCriteria.minCreditScore}
              </span>
            )}
            {product.eligibilityCriteria.maxObligationRatioPercent !== undefined && (
              <span className="px-2.5 py-1 rounded bg-surface-2 text-fg">
                Max obligation ratio: {product.eligibilityCriteria.maxObligationRatioPercent}%
              </span>
            )}
            {product.eligibilityCriteria.allowedSegments && (
              <span className="px-2.5 py-1 rounded bg-surface-2 text-fg">
                Eligible segments: {product.eligibilityCriteria.allowedSegments.join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Interactive EMI Calculator */}
      <div className="space-y-4">
        <h2 className="text-h2 font-semibold text-fg">Calculate EMI & Schedule</h2>
        <EmiCalculator
          defaultPrincipal={defaultPrincipal}
          defaultRate={product.minInterestRate}
          defaultTenure={defaultTenure}
          rateBounds={[product.minInterestRate, product.maxInterestRate]}
          tenureBounds={[product.minTenureMonths, product.maxTenureMonths]}
        />
      </div>
    </div>
  );
}
