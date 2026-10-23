import type { Confidence } from '../../api/types';
import { Badge } from '../ui/Badge';

export interface ConfidenceBadgeProps {
  confidence: Confidence;
  className?: string;
}

export function ConfidenceBadge({ confidence, className = '' }: ConfidenceBadgeProps) {
  const confidenceConfig: Record<Confidence, { tone: 'success' | 'warn' | 'danger' }> = {
    HIGH: { tone: 'success' },
    MEDIUM: { tone: 'warn' },
    LOW: { tone: 'danger' },
  };

  const config = confidenceConfig[confidence] ?? { tone: 'warn' };

  return (
    <Badge tone={config.tone} className={className}>
      Confidence: {confidence}
    </Badge>
  );
}
