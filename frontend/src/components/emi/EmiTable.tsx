import React from 'react';
import { Download } from 'lucide-react';
import type { ScheduleRow } from '../../api/types';
import { Money } from '../ui/Money';
import { Button } from '../ui/Button';

export interface EmiTableProps {
  schedule: ScheduleRow[];
}

export const COLUMNS: {
  key: string;
  label: string;
  align: 'left' | 'right';
  hideMobile?: boolean;
  render: (r: ScheduleRow, i: number, rows: ScheduleRow[]) => React.ReactNode;
}[] = [
  { key: 'month', label: 'Month', align: 'left', render: (r) => `#${r.month}` },
  {
    key: 'openingBalance',
    label: 'Opening Balance',
    align: 'right',
    hideMobile: true,
    render: (r) => <Money amount={r.openingBalance} />,
  },
  { key: 'emi', label: 'EMI', align: 'right', render: (r) => <Money amount={r.emi} /> },
  {
    key: 'principal',
    label: 'Principal',
    align: 'right',
    render: (r) => (
      <span className="text-success font-medium">
        <Money amount={r.principalComponent} />
      </span>
    ),
  },
  {
    key: 'interest',
    label: 'Interest',
    align: 'right',
    render: (r) => (
      <span className="text-warn font-medium">
        <Money amount={r.interestComponent} />
      </span>
    ),
  },
  {
    key: 'closingBalance',
    label: 'Closing Balance',
    align: 'right',
    render: (r) => <Money amount={r.closingBalance} />,
  },
];

export function EmiTable({ schedule }: EmiTableProps) {
  const downloadCsv = () => {
    const headers = COLUMNS.map((c) => c.label);
    const rows = schedule.map((row, i) =>
      COLUMNS.map((c) => {
        if (c.key === 'month') return row.month;
        if (c.key === 'openingBalance') return row.openingBalance;
        if (c.key === 'emi') return row.emi;
        if (c.key === 'principal') return row.principalComponent;
        if (c.key === 'interest') return row.interestComponent;
        if (c.key === 'closingBalance') return row.closingBalance;
        return '';
      })
    );

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `amortization_schedule_${schedule.length}_months.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={downloadCsv}
          className="gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Download CSV
        </Button>
      </div>

      <div className="max-h-96 overflow-y-auto overflow-x-auto border border-border rounded-md">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-surface-2 z-10 border-b border-border">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`p-2.5 font-semibold text-fg ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  } ${col.hideMobile ? 'hidden md:table-cell' : ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {schedule.map((row, i) => (
              <tr key={row.month} className="hover:bg-surface-2/60 transition-colors">
                {COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    className={`p-2.5 font-medium ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    } ${col.hideMobile ? 'hidden md:table-cell' : ''}`}
                  >
                    {col.render(row, i, schedule)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
