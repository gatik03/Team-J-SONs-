import { useQuery } from '@tanstack/react-query';
import { api } from '../client';
import type { AuditTrail } from '../types';

export function useAuditTrail(auditTrailId?: string) {
  return useQuery<AuditTrail, Error>({
    queryKey: ['audit', auditTrailId],
    queryFn: () => api<AuditTrail>(`/api/audit/${auditTrailId}`),
    enabled: Boolean(auditTrailId),
  });
}
