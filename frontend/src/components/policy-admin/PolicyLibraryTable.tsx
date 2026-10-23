import { Link } from 'react-router';
import type { PolicyLibraryItem } from '../../api/types';
import { formatDate } from '../../lib/formatDate';
import { ServingStateBadge } from './ServingStateBadge';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { DOCUMENT_TYPE_LABEL } from '../knowledge/KnowledgeTable';

export interface PolicyLibraryTableProps {
  items: PolicyLibraryItem[];
}

export function PolicyLibraryTable({ items }: PolicyLibraryTableProps) {
  return (
    <div className="bg-surface border border-border rounded-lg shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-surface-2 border-b border-border">
            <tr>
              <th className="p-3.5 font-semibold text-fg">Policy</th>
              <th className="p-3.5 font-semibold text-fg">Type</th>
              <th className="p-3.5 font-semibold text-fg">Audience</th>
              <th className="p-3.5 font-semibold text-fg">Active Version</th>
              <th className="p-3.5 font-semibold text-fg">Scheduled Version</th>
              <th className="p-3.5 font-semibold text-fg text-center">Drafts</th>
              <th className="p-3.5 font-semibold text-fg text-center">Versions</th>
              <th className="p-3.5 font-semibold text-fg text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-xs">
            {items.map((item) => (
              <tr key={item.documentKey} className="hover:bg-surface-2/40 transition-colors">
                <td className="p-3.5">
                  <Link
                    to={`/admin/policies/${item.documentKey}`}
                    className="font-semibold text-primary hover:underline text-sm block"
                  >
                    {item.title}
                  </Link>
                  <span className="font-mono text-muted text-[11px]">{item.documentKey}</span>
                </td>
                <td className="p-3.5 text-muted">
                  {DOCUMENT_TYPE_LABEL[item.documentType] ?? item.documentType}
                </td>
                <td className="p-3.5">
                  <Badge tone={item.audience === 'CUSTOMER' ? 'info' : 'neutral'}>
                    {item.audience === 'CUSTOMER' ? 'Customer' : 'Internal'}
                  </Badge>
                </td>
                <td className="p-3.5">
                  {item.activeVersion ? (
                    <div className="flex items-center gap-1.5">
                      <ServingStateBadge state="ACTIVE" />
                      <span className="font-medium text-fg">v{item.activeVersion}</span>
                      <span className="text-muted">({formatDate(item.activeEffectiveDate!)})</span>
                    </div>
                  ) : (
                    <span className="text-danger font-medium">None in force</span>
                  )}
                </td>
                <td className="p-3.5">
                  {item.scheduledVersion ? (
                    <div className="flex items-center gap-1.5">
                      <ServingStateBadge state="SCHEDULED" />
                      <span className="font-medium text-fg">v{item.scheduledVersion}</span>
                      <span className="text-muted">({formatDate(item.scheduledEffectiveDate!)})</span>
                    </div>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="p-3.5 text-center">
                  {item.draftCount > 0 ? (
                    <Badge tone="neutral">{item.draftCount}</Badge>
                  ) : (
                    <span className="text-muted">0</span>
                  )}
                </td>
                <td className="p-3.5 text-center font-mono font-medium text-fg">
                  {item.totalVersions}
                </td>
                <td className="p-3.5 text-right">
                  <Link to={`/admin/policies/new?documentKey=${item.documentKey}`}>
                    <Button variant="secondary" size="sm">
                      Upload new version
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
