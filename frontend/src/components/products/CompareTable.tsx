import type { LoanProduct } from '../../api/types';
import { formatPercent } from '../../lib/formatInr';
import { Money } from '../ui/Money';
import { Badge } from '../ui/Badge';

export interface CompareTableProps {
  products: LoanProduct[];
}

export function CompareTable({ products }: CompareTableProps) {
  // Determine minimums for comparison highlighting without arithmetic
  const minRateProduct = products.reduce((prev, curr) =>
    curr.minInterestRate < prev.minInterestRate ? curr : prev
  );
  const minFeeProduct = products.reduce((prev, curr) =>
    curr.processingFeePercent < prev.processingFeePercent ? curr : prev
  );

  return (
    <div className="bg-surface border border-border rounded-lg shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="p-4 font-semibold text-fg sticky left-0 bg-surface-2 z-10 min-w-[180px]">
                Product Features
              </th>
              {products.map((p) => (
                <th key={p.productId} className="p-4 font-semibold text-fg min-w-[220px]">
                  <div>
                    <span className="text-xs text-muted font-mono">{p.productId}</span>
                    <h4 className="text-sm font-bold text-fg">{p.name}</h4>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {/* Rate range */}
            <tr>
              <td className="p-4 font-medium text-muted sticky left-0 bg-surface z-10">
                Interest rate range
              </td>
              {products.map((p) => {
                const isBest = p.productId === minRateProduct.productId;
                return (
                  <td key={p.productId} className={`p-4 ${isBest ? 'bg-success-soft/40' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-fg">
                        {formatPercent(p.minInterestRate)} – {formatPercent(p.maxInterestRate)} p.a.
                      </span>
                      {isBest && <Badge tone="success">Best rate</Badge>}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Tenure */}
            <tr>
              <td className="p-4 font-medium text-muted sticky left-0 bg-surface z-10">
                Tenure range
              </td>
              {products.map((p) => (
                <td key={p.productId} className="p-4 text-fg">
                  {p.minTenureMonths} – {p.maxTenureMonths} months
                </td>
              ))}
            </tr>

            {/* Amount */}
            <tr>
              <td className="p-4 font-medium text-muted sticky left-0 bg-surface z-10">
                Loan amount
              </td>
              {products.map((p) => (
                <td key={p.productId} className="p-4 text-fg font-medium">
                  <Money amount={p.minAmount} /> – <Money amount={p.maxAmount} />
                </td>
              ))}
            </tr>

            {/* Processing fee */}
            <tr>
              <td className="p-4 font-medium text-muted sticky left-0 bg-surface z-10">
                Processing fee
              </td>
              {products.map((p) => {
                const isBest = p.productId === minFeeProduct.productId;
                return (
                  <td key={p.productId} className={`p-4 ${isBest ? 'bg-success-soft/40' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-fg font-medium">
                        {formatPercent(p.processingFeePercent)}
                        {p.processingFeeMin ? ` (min ₹${p.processingFeeMin.toLocaleString('en-IN')})` : ''}
                      </span>
                      {isBest && <Badge tone="success">Best fee</Badge>}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Min income */}
            <tr>
              <td className="p-4 font-medium text-muted sticky left-0 bg-surface z-10">
                Min monthly income
              </td>
              {products.map((p) => (
                <td key={p.productId} className="p-4 text-fg">
                  <Money amount={p.eligibilityCriteria.minMonthlyIncome ?? 0} />
                </td>
              ))}
            </tr>

            {/* Min credit score */}
            <tr>
              <td className="p-4 font-medium text-muted sticky left-0 bg-surface z-10">
                Min credit score
              </td>
              {products.map((p) => (
                <td key={p.productId} className="p-4 text-fg">
                  {p.eligibilityCriteria.minCreditScore ?? 'None'}
                </td>
              ))}
            </tr>

            {/* Max obligation ratio */}
            <tr>
              <td className="p-4 font-medium text-muted sticky left-0 bg-surface z-10">
                Max obligation ratio
              </td>
              {products.map((p) => (
                <td key={p.productId} className="p-4 text-fg">
                  {p.eligibilityCriteria.maxObligationRatioPercent
                    ? formatPercent(p.eligibilityCriteria.maxObligationRatioPercent)
                    : 'N/A'}
                </td>
              ))}
            </tr>

            {/* Allowed segments */}
            <tr>
              <td className="p-4 font-medium text-muted sticky left-0 bg-surface z-10">
                Allowed customer segments
              </td>
              {products.map((p) => (
                <td key={p.productId} className="p-4 text-fg">
                  <div className="flex flex-wrap gap-1">
                    {p.eligibilityCriteria.allowedSegments?.map((seg) => (
                      <Badge key={seg} tone="neutral">
                        {seg}
                      </Badge>
                    ))}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
