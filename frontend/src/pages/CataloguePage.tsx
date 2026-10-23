import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';
import { useProducts } from '../api/hooks/products';
import type { CustomerSegment, LoanType, ProductQuery, ProductSort } from '../api/types';
import { CatalogueFilters } from '../components/products/CatalogueFilters';
import { ProductCard } from '../components/products/ProductCard';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { Button } from '../components/ui/Button';

const MAX_COMPARE = 4;

export function CataloguePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const q = searchParams.get('q') ?? '';
  const loanType = (searchParams.get('loanType') ?? 'ALL') as LoanType | 'ALL';
  const segment = (searchParams.get('segment') ?? 'ALL') as CustomerSegment | 'ALL';
  const minAmount = searchParams.get('minAmount') ? Number(searchParams.get('minAmount')) : undefined;
  const maxAmount = searchParams.get('maxAmount') ? Number(searchParams.get('maxAmount')) : undefined;
  const sort = (searchParams.get('sort') ?? 'name') as ProductSort;

  const query: ProductQuery = {
    q: q || undefined,
    loanType: loanType === 'ALL' ? undefined : loanType,
    segment: segment === 'ALL' ? undefined : segment,
    minAmount,
    maxAmount,
    sort,
  };

  const { data: products, isLoading, error } = useProducts(query);

  const handleFilterChange = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '') {
        next.delete(k);
      } else {
        next.set(k, v);
      }
    }
    setSearchParams(next);
  };

  const handleReset = () => {
    setSearchParams(new URLSearchParams());
  };

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : prev.length < MAX_COMPARE ? [...prev, id] : prev
    );
  };

  const handleCompare = () => {
    if (selectedIds.length >= 2 && selectedIds.length <= MAX_COMPARE) {
      navigate(`/compare?ids=${selectedIds.join(',')}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-fg">Find a loan that fits your life.</h1>
          <p className="text-sm text-muted">
            Explore your options, understand the numbers, and take your next step with confidence.
          </p>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">
              {selectedIds.length} of {MAX_COMPARE} selected
            </span>
            <Button
              onClick={handleCompare}
              disabled={selectedIds.length < 2}
              size="sm"
            >
              Compare ({selectedIds.length})
            </Button>
          </div>
        )}
      </div>

      <section className="catalogue-banner"><div><h2>Your ambitions.<br/>Our expertise.</h2><p>From everyday plans to life’s biggest milestones,<br/>there’s a lending option worth exploring.</p><Link className="text-link" to="/advisor">Find my fit with the loan advisor <ArrowUpRight size={18}/></Link></div><div className="banner-aside"><ShieldCheck size={34}/><strong>Clarity at every step</strong><span>Transparent terms<br/>Personal guidance<br/>Always a human decision</span></div></section>
      <div className="section-heading"><h2>Explore our loans</h2><span>{products?.length ?? '…'} options for your next move</span></div>
      <CatalogueFilters
        q={q}
        loanType={loanType}
        segment={segment}
        minAmount={minAmount}
        maxAmount={maxAmount}
        sort={sort}
        onChange={handleFilterChange}
        onReset={handleReset}
      />

      {error && <ErrorAlert error={error} />}

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-lg p-5 space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="w-16 h-5" />
                <Skeleton className="w-12 h-4" />
              </div>
              <Skeleton className="w-3/4 h-6" />
              <Skeleton className="w-full h-12" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && products && products.length === 0 && (
        <EmptyState
          title="No products match your filters"
          description="Try relaxing your search terms or clearing specific filters to see more results."
          action={<Button onClick={handleReset} variant="secondary">Clear filters</Button>}
        />
      )}

      {!isLoading && products && products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.productId}
              product={product}
              selected={selectedIds.includes(product.productId)}
              onToggle={handleToggle}
              disableSelect={selectedIds.length >= MAX_COMPARE}
            />
          ))}
        </div>
      )}

      {/* Sticky Bottom Compare Bar if items selected */}
      {selectedIds.length >= 2 && (
        <div className="sticky bottom-6 z-30 flex justify-center">
          <div className="bg-surface text-fg border border-border shadow-pop rounded-full px-6 py-3 flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedIds.length} products selected for comparison
            </span>
            <Button onClick={handleCompare} size="sm">
              Compare now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
