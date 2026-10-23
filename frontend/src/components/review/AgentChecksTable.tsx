import { AlertTriangle } from 'lucide-react';
import type { AgentRecommendation, CheckResult, Recommendation, RiskBand } from '../../api/types';
import { Badge } from '../ui/Badge';
import { AiTag } from '../ui/AiTag';

export interface AgentChecksTableProps {
  rec: AgentRecommendation;
}

export function AgentChecksTable({ rec }: AgentChecksTableProps) {
  const recConfig: Record<
    Recommendation,
    { label: string; tone: 'warn' | 'success' | 'danger' | 'info' }
  > = {
    REQUEST_ADDITIONAL_DOCUMENTS: { label: 'Request Additional Documents', tone: 'warn' },
    RECOMMEND_APPROVE: { label: 'Recommend Approve', tone: 'success' },
    RECOMMEND_REJECT: { label: 'Recommend Reject', tone: 'danger' },
    REFER_TO_HUMAN: { label: 'Refer To Human Officer', tone: 'info' },
  };

  const riskConfig: Record<RiskBand, { tone: 'success' | 'warn' | 'danger' }> = {
    LOW: { tone: 'success' },
    MEDIUM: { tone: 'warn' },
    HIGH: { tone: 'danger' },
  };

  const checkResultConfig: Record<
    CheckResult,
    { tone: 'success' | 'danger' | 'warn'; isException?: boolean }
  > = {
    PASS: { tone: 'success' },
    FAIL: { tone: 'danger' },
    INCOMPLETE: { tone: 'warn' },
    EXCEPTION: { tone: 'danger', isException: true },
  };

  const currentRec = recConfig[rec.recommendation] ?? { label: rec.recommendation, tone: 'warn' };
  const currentRisk = riskConfig[rec.riskBand] ?? { tone: 'warn' };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge tone={currentRec.tone} className="text-sm px-3 py-1">
            {currentRec.label}
          </Badge>
          <Badge tone={currentRisk.tone} className="text-xs">
            Risk: {rec.riskBand}
          </Badge>
        </div>

        <span className="text-xs font-mono text-muted">
          Audit Trail ID: {rec.auditTrailId}
        </span>
      </div>

      {rec.missingDocuments && rec.missingDocuments.length > 0 && (
        <div className="p-3 bg-warn-soft/40 border border-warn/20 rounded-md">
          <span className="text-xs font-bold text-warn uppercase tracking-wider block mb-1">
            Missing Documents
          </span>
          <ul className="list-disc list-inside text-xs text-fg space-y-0.5">
            {rec.missingDocuments.map((doc, idx) => (
              <li key={idx}>{doc}</li>
            ))}
          </ul>
        </div>
      )}

      {rec.customerMessage && (
        <div className="p-3.5 bg-surface-2 border-l-4 border-accent rounded-r-md">
          <span className="text-xs font-semibold text-muted block mb-1">
            Drafted Customer Message (AI Generated)
          </span>
          <p className="text-xs text-fg italic">"{rec.customerMessage}"</p>
        </div>
      )}

      {/* Checks Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-surface-2 border-b border-border">
            <tr>
              <th className="p-3 font-semibold text-fg">Agent</th>
              <th className="p-3 font-semibold text-fg">Result</th>
              <th className="p-3 font-semibold text-fg">Verification Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rec.checks.map((check, idx) => {
              const resConfig = checkResultConfig[check.result] ?? { tone: 'warn' };

              return (
                <tr key={idx} className="hover:bg-surface-2/30 transition-colors">
                  <td className="p-3 font-medium text-fg">
                    <div className="flex items-center gap-2">
                      <AiTag />
                      <span>{check.agent}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      {resConfig.isException && (
                        <AlertTriangle className="w-3.5 h-3.5 text-danger flex-shrink-0" />
                      )}
                      <Badge
                        tone={resConfig.tone}
                        className={resConfig.isException ? 'font-bold' : undefined}
                      >
                        {check.result}
                      </Badge>
                    </div>
                  </td>
                  <td className="p-3 text-fg">{check.detail}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
