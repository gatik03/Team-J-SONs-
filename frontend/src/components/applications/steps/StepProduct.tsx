import { useProducts } from '../../../api/hooks/products';
import { Field } from '../../ui/Field';
import { Money } from '../../ui/Money';
import { formatPercent } from '../../../lib/formatInr';

export interface StepProductProps {
  productId?: string;
  requestedAmount?: number;
  tenureMonths?: number;
  purpose?: string;
  errors?: Record<string, string>;
  onChange: (patch: {
    productId?: string;
    requestedAmount?: number;
    tenureMonths?: number;
    purpose?: string;
  }) => void;
}

export function StepProduct({
  productId,
  requestedAmount,
  tenureMonths,
  purpose,
  errors = {},
  onChange,
}: StepProductProps) {
  const { data: products } = useProducts();
  const selectedProduct = products?.find((p) => p.productId === productId);

  return (
    <div className="space-y-4">
      <Field id="step-product-id" label="Loan product" error={errors.productId} required>
        <select
          value={productId ?? ''}
          onChange={(e) => {
            const nextId = e.target.value;
            const p = products?.find((item) => item.productId === nextId);
            onChange({
              productId: nextId || undefined,
              requestedAmount: p ? Math.max(p.minAmount, Math.min(requestedAmount ?? 500000, p.maxAmount)) : requestedAmount,
              tenureMonths: p ? Math.max(p.minTenureMonths, Math.min(tenureMonths ?? 60, p.maxTenureMonths)) : tenureMonths,
            });
          }}
          className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-sm"
        >
          <option value="">Select a loan product...</option>
          {products?.map((p) => (
            <option key={p.productId} value={p.productId}>
              {p.name} ({formatPercent(p.minInterestRate)} – {formatPercent(p.maxInterestRate)})
            </option>
          ))}
        </select>
      </Field>

      {selectedProduct && (
        <div className="p-3 bg-surface-2 rounded-md text-xs space-y-1">
          <p className="font-semibold text-fg">{selectedProduct.description}</p>
          <div className="flex gap-4 text-muted">
            <span>
              Amount: <Money amount={selectedProduct.minAmount} /> – <Money amount={selectedProduct.maxAmount} />
            </span>
            <span>
              Tenure: {selectedProduct.minTenureMonths} – {selectedProduct.maxTenureMonths} mos
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          id="step-requested-amount"
          label="Requested amount (₹)"
          error={errors.requestedAmount}
          hint={
            selectedProduct
              ? `Allowed: ₹${selectedProduct.minAmount.toLocaleString('en-IN')} – ₹${selectedProduct.maxAmount.toLocaleString('en-IN')}`
              : undefined
          }
          required
        >
          <input
            type="number"
            min={selectedProduct?.minAmount ?? 10000}
            max={selectedProduct?.maxAmount ?? 50000000}
            value={requestedAmount ?? ''}
            onChange={(e) =>
              onChange({ requestedAmount: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-sm"
            placeholder="e.g. 500000"
          />
        </Field>

        <Field
          id="step-tenure-months"
          label="Tenure (months)"
          error={errors.tenureMonths}
          hint={
            selectedProduct
              ? `Allowed: ${selectedProduct.minTenureMonths} – ${selectedProduct.maxTenureMonths} months`
              : undefined
          }
          required
        >
          <input
            type="number"
            min={selectedProduct?.minTenureMonths ?? 6}
            max={selectedProduct?.maxTenureMonths ?? 360}
            value={tenureMonths ?? ''}
            onChange={(e) =>
              onChange({ tenureMonths: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-sm"
            placeholder="e.g. 60"
          />
        </Field>
      </div>

      <Field id="step-purpose" label="Loan purpose" error={errors.purpose} required>
        <textarea
          rows={3}
          value={purpose ?? ''}
          onChange={(e) => onChange({ purpose: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-sm"
          placeholder="e.g. Used car purchase or home renovation"
        />
      </Field>
    </div>
  );
}
