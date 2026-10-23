import { AlertTriangle, FileCheck } from 'lucide-react';
import type { LoanApplication } from '../../../api/types';
import { useProducts } from '../../../api/hooks/products';
import { useDocuments } from '../../../api/hooks/documents';
import { Money } from '../../ui/Money';

export interface StepReviewProps {
  application: LoanApplication;
}

export function StepReview({ application }: StepReviewProps) {
  const { data: products } = useProducts();
  const { data: docs } = useDocuments(application.applicationId);

  const product = products?.find((p) => p.productId === application.productId);

  const hasIdentity = docs?.some((d) => d.documentType === 'IDENTITY');
  const hasAddress = docs?.some((d) => d.documentType === 'ADDRESS');
  const hasIncome = docs?.some((d) => d.documentType === 'INCOME');
  const missingProof = !hasIdentity || !hasAddress || !hasIncome;

  return (
    <div className="space-y-6">
      {missingProof && (
        <div className="flex items-start gap-3 p-3.5 rounded-md bg-warn-soft border border-warn/20 text-warn text-xs">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Missing supporting documents</span>
            <span>
              Your application can be submitted; the bank may ask for additional documents later during verification.
            </span>
          </div>
        </div>
      )}

      {/* Product & Loan Summary */}
      <div className="border border-border rounded-lg p-4 bg-surface space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Loan Request
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-xs text-muted block">Product</span>
            <span className="font-semibold text-fg">{product?.name ?? application.productId}</span>
          </div>
          <div>
            <span className="text-xs text-muted block">Requested Amount</span>
            <span className="font-semibold text-fg">
              <Money amount={application.requestedAmount} />
            </span>
          </div>
          <div>
            <span className="text-xs text-muted block">Tenure</span>
            <span className="font-semibold text-fg">{application.tenureMonths} months</span>
          </div>
          <div>
            <span className="text-xs text-muted block">Estimated Monthly EMI</span>
            <span className="font-bold text-primary">
              {application.estimatedEmi ? (
                <Money amount={application.estimatedEmi} />
              ) : (
                'Calculated after you save'
              )}
            </span>
          </div>
        </div>
        <div>
          <span className="text-xs text-muted block">Purpose</span>
          <p className="text-xs text-fg mt-0.5">{application.purpose}</p>
        </div>
      </div>

      {/* Employment & Financial Summary */}
      <div className="border border-border rounded-lg p-4 bg-surface space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Employment & Finances
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-xs text-muted block">Employment Type</span>
            <span className="font-semibold text-fg">{application.employmentType}</span>
          </div>
          <div>
            <span className="text-xs text-muted block">Monthly Income</span>
            <span className="font-semibold text-fg">
              <Money amount={application.monthlyIncome} />
            </span>
          </div>
          <div>
            <span className="text-xs text-muted block">Existing Monthly Obligations</span>
            <span className="font-semibold text-fg">
              <Money amount={application.existingMonthlyObligations} />
            </span>
          </div>
        </div>
      </div>

      {/* Uploaded Documents */}
      <div className="border border-border rounded-lg p-4 bg-surface space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Uploaded Documents ({docs?.length ?? 0})
        </h4>
        {docs && docs.length > 0 ? (
          <ul className="divide-y divide-border text-xs">
            {docs.map((doc) => (
              <li key={doc.documentId} className="py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-success" />
                  <span className="font-medium text-fg">{doc.fileName}</span>
                  <span className="text-muted">({doc.documentType})</span>
                </div>
                <span className="text-muted">{(doc.sizeBytes / 1024).toFixed(1)} KB</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted">No documents uploaded yet.</p>
        )}
      </div>
    </div>
  );
}
