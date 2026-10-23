import { Search } from 'lucide-react';
import type { CustomerSegment, LoanType, ProductSort } from '../../api/types';

export interface CatalogueFiltersProps {
  q: string;
  loanType: LoanType | 'ALL';
  segment: CustomerSegment | 'ALL';
  minAmount?: number;
  maxAmount?: number;
  sort: ProductSort;
  onChange: (patch: Record<string, string | undefined>) => void;
  onReset: () => void;
}

export function CatalogueFilters({
  q,
  loanType,
  segment,
  minAmount,
  maxAmount,
  sort,
  onChange,
  onReset,
}: CatalogueFiltersProps) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 shadow-card mb-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="space-y-1">
          <label htmlFor="filter-search" className="block text-xs font-medium text-fg">
            Search products
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
            <input
              id="filter-search"
              type="text"
              value={q}
              onChange={(e) => onChange({ q: e.target.value || undefined })}
              placeholder="e.g. Kestrel Personal"
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-border rounded-md bg-surface text-fg focus-ring"
            />
          </div>
        </div>

        {/* Loan Type */}
        <div className="space-y-1">
          <label htmlFor="filter-type" className="block text-xs font-medium text-fg">
            Loan type
          </label>
          <select
            id="filter-type"
            value={loanType}
            onChange={(e) => onChange({ loanType: e.target.value === 'ALL' ? undefined : e.target.value })}
            className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-surface text-fg focus-ring"
          >
            <option value="ALL">All loan types</option>
            <option value="PERSONAL">Personal</option>
            <option value="HOME">Home</option>
            <option value="VEHICLE">Vehicle</option>
            <option value="EDUCATION">Education</option>
          </select>
        </div>

        {/* Customer Segment */}
        <div className="space-y-1">
          <label htmlFor="filter-segment" className="block text-xs font-medium text-fg">
            Customer segment
          </label>
          <select
            id="filter-segment"
            value={segment}
            onChange={(e) => onChange({ segment: e.target.value === 'ALL' ? undefined : e.target.value })}
            className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-surface text-fg focus-ring"
          >
            <option value="ALL">All segments</option>
            <option value="SALARIED">Salaried</option>
            <option value="SELF_EMPLOYED">Self-employed</option>
            <option value="STUDENT">Student</option>
          </select>
        </div>

        {/* Sort */}
        <div className="space-y-1">
          <label htmlFor="filter-sort" className="block text-xs font-medium text-fg">
            Sort by
          </label>
          <select
            id="filter-sort"
            value={sort}
            onChange={(e) => onChange({ sort: e.target.value as ProductSort })}
            className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-surface text-fg focus-ring"
          >
            <option value="rate_asc">Lowest rate</option>
            <option value="rate_desc">Highest rate</option>
            <option value="amount_asc">Lowest amount</option>
            <option value="amount_desc">Highest amount</option>
            <option value="tenure_asc">Shortest tenure</option>
            <option value="tenure_desc">Longest tenure</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="filter-minAmount" className="text-xs text-muted whitespace-nowrap">
              Min amount (₹)
            </label>
            <input
              id="filter-minAmount"
              type="number"
              value={minAmount ?? ''}
              onChange={(e) => onChange({ minAmount: e.target.value || undefined })}
              placeholder="0"
              className="w-28 px-2.5 py-1 text-sm border border-border rounded-md bg-surface text-fg focus-ring"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="filter-maxAmount" className="text-xs text-muted whitespace-nowrap">
              Max amount (₹)
            </label>
            <input
              id="filter-maxAmount"
              type="number"
              value={maxAmount ?? ''}
              onChange={(e) => onChange({ maxAmount: e.target.value || undefined })}
              placeholder="50,00,000"
              className="w-28 px-2.5 py-1 text-sm border border-border rounded-md bg-surface text-fg focus-ring"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="text-xs text-primary font-medium hover:underline focus-ring px-2 py-1"
        >
          Reset filters
        </button>
      </div>
    </div>
  );
}
