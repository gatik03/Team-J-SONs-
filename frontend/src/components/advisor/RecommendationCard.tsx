import { Link } from 'react-router';
import type { AdvisorRecommendation, EligibilityIndicator } from '../../api/types';
import { formatPercent } from '../../lib/formatInr';
import { Money } from '../ui/Money';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useAuth } from '../../auth/AuthContext';

export interface RecommendationCardProps {
  rec: AdvisorRecommendation;
  onApply?: (productId: string) => void;
}

export function RecommendationCard({ rec, onApply }: RecommendationCardProps) {
  const { user } = useAuth();

  const eligibilityConfig: Record<
    EligibilityIndicator,
    { label: string; tone: 'success' | 'warn' | 'danger' | 'neutral' }
  > = {
    LIKELY_ELIGIBLE: { label: 'Likely Eligible', tone: 'success' },
    BORDERLINE: { label: 'Borderline', tone: 'warn' },
    UNLIKELY_ELIGIBLE: { label: 'Unlikely Eligible', tone: 'danger' },
    UNKNOWN: { label: 'Unknown', tone: 'neutral' },
  };

  const style = eligibilityConfig[rec.eligibilityIndicator] ?? {
    label: rec.eligibilityIndicator,
    tone: 'neutral',
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-4 shadow-card space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-fg">{rec.productName}</h4>
          <span className="text-xs text-muted font-mono">{rec.productId}</span>
        </div>
        <Badge tone={style.tone}>{style.label}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 p-2.5 bg-surface-2 rounded-md text-xs">
        <div>
          <span className="text-muted block">Indicative Rate</span>
          <span className="font-semibold text-fg">{formatPercent(rec.indicativeInterestRate)}</span>
        </div>
        <div>
          <span className="text-muted block">Tenure</span>
          <span className="font-semibold text-fg">{rec.tenureMonths} months</span>
        </div>
        <div>
          <span className="text-muted block">Estimated EMI</span>
          <span className="font-bold text-primary text-h3 block">
            <Money amount={rec.estimatedEmi} />
          </span>
        </div>
      </div>

      <p className="text-xs text-muted leading-relaxed">{rec.reason}</p>

      {user?.role === 'CUSTOMER' && (
        <div className="pt-2 border-t border-border flex justify-end">
          {onApply ? (
            <Button size="sm" onClick={() => onApply(rec.productId)}>
              Apply with this product
            </Button>
          ) : (
            <Link to={`/applications/new?productId=${rec.productId}`}>
              <Button size="sm">Apply with this product</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
