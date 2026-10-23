import { useMutation } from '@tanstack/react-query';
import { api } from '../client';
import type { AdvisorRequest, AdvisorResponse } from '../types';

export function useAdvisorChat() {
  return useMutation<AdvisorResponse, Error, AdvisorRequest>({
    mutationFn: (req) => api<AdvisorResponse>('/api/advisor/chat', { method: 'POST', body: req }),
  });
}
