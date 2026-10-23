import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../client';
import type { AgentRecommendation } from '../types';

export function useRunWorkflow(id?: string) {
  const queryClient = useQueryClient();
  return useMutation<AgentRecommendation, Error, { demoPermissionViolation?: boolean }>({
    mutationFn: ({ demoPermissionViolation } = {}) =>
      api<AgentRecommendation>(`/api/workflow/applications/${id}/run`, {
        method: 'POST',
        query: demoPermissionViolation ? { demoPermissionViolation: 'true' } : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      queryClient.invalidateQueries({ queryKey: ['recommendation', id] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

export function useRecommendation(id?: string) {
  return useQuery<AgentRecommendation | null, Error>({
    queryKey: ['recommendation', id],
    queryFn: async () => {
      try {
        return await api<AgentRecommendation>(`/api/workflow/applications/${id}/recommendation`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: Boolean(id),
  });
}
