import type { KnowledgeDocument, KnowledgeDocumentType } from '../../api/types';
import { formatDate } from '../../lib/formatDate';
import { Badge } from '../ui/Badge';

export interface KnowledgeTableProps {
  docs: KnowledgeDocument[];
}

export const DOCUMENT_TYPE_LABEL: Record<KnowledgeDocumentType, string> = {
  TERMS_AND_CONDITIONS: 'Terms & Conditions',
  RATE_FEE_SCHEDULE: 'Rate & Fee Schedule',
  CREDIT_POLICY: 'Credit Policy',
  KYC_CHECKLIST: 'KYC Checklist',
  PREPAYMENT_POLICY: 'Prepayment Policy',
  GRIEVANCE: 'Grievance Redressal',
  REGULATORY_CIRCULAR: 'Regulatory Circular',
  OFFICER_PLAYBOOK: 'Officer Playbook',
};

export function KnowledgeTable({ docs }: KnowledgeTableProps) {
  const sorted = [...docs].sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="bg-surface border border-border rounded-lg shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-surface-2 border-b border-border">
            <tr>
              <th className="p-3.5 font-semibold text-fg">Title</th>
              <th className="p-3.5 font-semibold text-fg">Policy Key</th>
              <th className="p-3.5 font-semibold text-fg">Version</th>
              <th className="p-3.5 font-semibold text-fg">Effective</th>
              <th className="p-3.5 font-semibold text-fg">Loan Type</th>
              <th className="p-3.5 font-semibold text-fg">Type</th>
              <th className="p-3.5 font-semibold text-fg">Audience</th>
              <th className="p-3.5 font-semibold text-fg">Segment</th>
              <th className="p-3.5 font-semibold text-fg text-right">Chunks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-xs">
            {sorted.map((doc) => (
              <tr key={doc.documentId} className="hover:bg-surface-2/40 transition-colors">
                <td className="p-3.5 font-semibold text-fg max-w-[200px] truncate">
                  {doc.title}
                </td>
                <td className="p-3.5 font-mono text-muted">{doc.documentKey}</td>
                <td className="p-3.5 font-mono font-medium text-fg">v{doc.version}</td>
                <td className="p-3.5 text-muted">{formatDate(doc.effectiveDate)}</td>
                <td className="p-3.5 text-fg">{doc.loanType}</td>
                <td className="p-3.5 text-muted">
                  {DOCUMENT_TYPE_LABEL[doc.documentType] ?? doc.documentType}
                </td>
                <td className="p-3.5">
                  <Badge tone={doc.audience === 'CUSTOMER' ? 'info' : 'neutral'}>
                    {doc.audience}
                  </Badge>
                </td>
                <td className="p-3.5 text-muted">{doc.customerSegment ?? 'ALL'}</td>
                <td className="p-3.5 text-right font-mono text-muted">{doc.chunkCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
