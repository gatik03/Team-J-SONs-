import { Link } from 'react-router';
import type { LoanProduct } from '../../api/types';
import { Badge } from '../ui/Badge';
import { Money } from '../ui/Money';
import { formatPercent } from '../../lib/formatInr';

export interface ProductCardProps {
  product: LoanProduct;
  selected: boolean;
  onToggle: (id: string) => void;
  disableSelect: boolean;
}

export function ProductCard({ product, selected, onToggle, disableSelect }: ProductCardProps) {
  const typeTones: Record<string, 'neutral' | 'success' | 'warn' | 'info' | 'accent'> = {
    PERSONAL: 'accent',
    HOME: 'info',
    VEHICLE: 'success',
    EDUCATION: 'warn',
  };

  return (
    <div className="bg-surface border border-border rounded-lg shadow-card p-5 flex flex-col justify-between hover:border-primary/40 transition-colors">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <Badge tone={typeTones[product.loanType] ?? 'neutral'}>
            {product.loanType}
          </Badge>
          <span className="text-xs text-muted font-mono">{product.productId}</span>
        </div>

        <h3 className="text-h3 font-semibold text-fg mb-1">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-muted mb-4 line-clamp-2">{product.description}</p>
        )}

        <div className="grid grid-cols-2 gap-3 p-3 bg-surface-2 rounded-md mb-4 text-xs">
          <div>
            <span className="text-muted block">Interest rate</span>
            <span className="font-semibold text-fg">
              {formatPercent(product.minInterestRate)} – {formatPercent(product.maxInterestRate)} p.a.
            </span>
          </div>

          <div>
            <span className="text-muted block">Tenure</span>
            <span className="font-semibold text-fg">
              {product.minTenureMonths} – {product.maxTenureMonths} mos
            </span>
          </div>

          <div>
            <span className="text-muted block">Loan amount</span>
            <span className="font-semibold text-fg">
              <Money amount={product.minAmount} /> – <Money amount={product.maxAmount} />
            </span>
          </div>

          <div>
            <span className="text-muted block">Processing fee</span>
            <span className="font-semibold text-fg">
              {formatPercent(product.processingFeePercent)}
              {product.processingFeeMin ? ` (min ₹${product.processingFeeMin.toLocaleString('en-IN')})` : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
        <label
          className={`flex items-center gap-2 text-xs font-medium cursor-pointer ${
            disableSelect && !selected ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          title={disableSelect && !selected ? 'You can compare up to 4 products' : undefined}
        >
          <input
            type="checkbox"
            checked={selected}
            disabled={disableSelect && !selected}
            onChange={() => onToggle(product.productId)}
            className="rounded border-border text-primary focus:ring-primary focus-ring"
          />
          Compare
        </label>

        <Link
          to={`/products/${product.productId}`}
          className="text-xs font-semibold text-primary hover:underline px-2.5 py-1.5 rounded-sm hover:bg-primary-soft transition-colors focus-ring"
        >
          View & calculate EMI
        </Link>
      </div>
    </div>
  );
}
