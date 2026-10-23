import { useMutation } from '@tanstack/react-query';
import { api } from '../client';
import type { PolicyAnswer, PolicyAskRequest } from '../types';

export function usePolicyAsk() {
  return useMutation<PolicyAnswer, Error, PolicyAskRequest>({
    mutationFn: (req) => api<PolicyAnswer>('/api/policy/ask', { method: 'POST', body: req }),
  });
}
