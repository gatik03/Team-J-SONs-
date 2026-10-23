import { useState } from 'react';
import type { AuditEventType, AuditTrail } from '../../api/types';
import { Badge } from '../ui/Badge';
import { formatDateTime } from '../../lib/formatDate';

export interface AuditTrailViewerProps {
  trail?: AuditTrail;
}

export function AuditTrailViewer({ trail }: AuditTrailViewerProps) {
  const [filterDeniedOnly, setFilterDeniedOnly] = useState(false);
  const [selectedType, setSelectedType] = useState<AuditEventType | 'ALL'>('ALL');

  if (!trail || !trail.events || trail.events.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-muted border border-dashed border-border rounded-lg bg-surface">
        No events recorded.
      </div>
    );
  }

  const sortedEvents = [...trail.events].sort((a, b) => a.sequence - b.sequence);

  const displayedEvents = sortedEvents.filter((ev) => {
    if (filterDeniedOnly) return ev.eventType === 'PERMISSION_DENIED';
    if (selectedType !== 'ALL') return ev.eventType === selectedType;
    return true;
  });

  const eventTypeTones: Record<
    AuditEventType,
    'neutral' | 'success' | 'warn' | 'danger' | 'info' | 'accent'
  > = {
    AGENT_START: 'neutral',
    AGENT_END: 'neutral',
    TOOL_CALL: 'info',
    TOOL_RESULT: 'info',
    LLM_CALL: 'neutral',
    LLM_RESULT: 'neutral',
    PERMISSION_DENIED: 'danger',
    HUMAN_REQUIRED: 'accent',
    POLICY_DRAFTED: 'neutral',
    POLICY_PUBLISHED: 'neutral',
    POLICY_RETIRED: 'neutral',
  };

  const allTypes: AuditEventType[] = Array.from(new Set(trail.events.map((e) => e.eventType)));

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSelectedType('ALL');
              setFilterDeniedOnly(false);
            }}
            className={`px-2.5 py-1 rounded-full border transition-colors focus-ring ${
              selectedType === 'ALL' && !filterDeniedOnly
                ? 'bg-primary text-white border-primary'
                : 'bg-surface border-border text-muted hover:text-fg'
            }`}
          >
            All ({trail.events.length})
          </button>

          {allTypes.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setSelectedType(t);
                setFilterDeniedOnly(false);
              }}
              className={`px-2 py-0.5 rounded-full border transition-colors focus-ring ${
                selectedType === t && !filterDeniedOnly
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface border-border text-muted hover:text-fg'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 cursor-pointer font-medium text-fg">
          <input
            type="checkbox"
            checked={filterDeniedOnly}
            onChange={(e) => setFilterDeniedOnly(e.target.checked)}
            className="rounded border-border text-danger focus-ring"
          />
          <span className="text-danger font-semibold">Show PERMISSION_DENIED only</span>
        </label>
      </div>

      {/* Events Table */}
      <div className="border border-border rounded-lg overflow-x-auto max-h-[500px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-surface-2 z-10 border-b border-border">
            <tr>
              <th className="p-2.5 font-semibold text-fg">#</th>
              <th className="p-2.5 font-semibold text-fg">Time</th>
              <th className="p-2.5 font-semibold text-fg">Agent</th>
              <th className="p-2.5 font-semibold text-fg">Event</th>
              <th className="p-2.5 font-semibold text-fg">Tool / Target</th>
              <th className="p-2.5 font-semibold text-fg text-right">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayedEvents.map((ev) => {
              const isDenied = ev.eventType === 'PERMISSION_DENIED';
              const isHuman = ev.eventType === 'HUMAN_REQUIRED';

              const rowBg = isDenied
                ? 'bg-danger-soft/60'
                : isHuman
                ? 'bg-accent-soft/40'
                : 'hover:bg-surface-2/30';

              const hasPayload = Boolean(ev.input || ev.output);

              return (
                <tr key={ev.sequence} className={`${rowBg} transition-colors`}>
                  <td className="p-2.5 font-mono text-muted">{ev.sequence}</td>
                  <td className="p-2.5 text-muted whitespace-nowrap">
                    {formatDateTime(ev.timestamp)}
                  </td>
                  <td className="p-2.5 font-medium text-fg">{ev.agent}</td>
                  <td className="p-2.5">
                    <Badge tone={eventTypeTones[ev.eventType] ?? 'neutral'}>
                      {ev.eventType}
                    </Badge>
                  </td>
                  <td className="p-2.5 text-fg font-mono">
                    {ev.toolName ?? '—'}
                    {hasPayload && (
                      <details className="mt-1">
                        <summary className="text-[11px] text-primary cursor-pointer hover:underline focus-ring">
                          View details
                        </summary>
                        <div className="mt-1 p-2 bg-surface border border-border rounded font-mono text-[11px] overflow-x-auto max-w-sm space-y-1">
                          {ev.input && (
                            <div>
                              <span className="font-bold text-muted">Input:</span>
                              <pre className="whitespace-pre-wrap">
                                {JSON.stringify(ev.input, null, 2)}
                              </pre>
                            </div>
                          )}
                          {ev.output && (
                            <div>
                              <span className="font-bold text-muted">Output:</span>
                              <pre className="whitespace-pre-wrap">
                                {JSON.stringify(ev.output, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </td>
                  <td className="p-2.5 text-right font-mono text-muted">
                    {ev.durationMs ? `${ev.durationMs}ms` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
