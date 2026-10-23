import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import type {
  ApplicationStatus,
  DecisionRequest,
  LoanApplication,
  LoanApplicationDraft,
} from '../types';

export function useApplications(status?: ApplicationStatus) {
  return useQuery<LoanApplication[], Error>({
    queryKey: ['applications', status],
    queryFn: () => api<LoanApplication[]>('/api/applications', { query: { status } }),
  });
}

export function useApplication(id?: string) {
  return useQuery<LoanApplication, Error>({
    queryKey: ['application', id],
    queryFn: () => api<LoanApplication>(`/api/applications/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateDraft() {
  const queryClient = useQueryClient();
  return useMutation<LoanApplication, Error, LoanApplicationDraft>({
    mutationFn: (draft) => api<LoanApplication>('/api/applications', { method: 'POST', body: draft }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

export function useSaveDraft(id?: string) {
  const queryClient = useQueryClient();
  return useMutation<LoanApplication, Error, LoanApplicationDraft>({
    mutationFn: (draft) => api<LoanApplication>(`/api/applications/${id}`, { method: 'PUT', body: draft }),
    onSuccess: (saved) => {
      queryClient.setQueryData(['application', id], saved);
    },
  });
}

export function useSubmitApplication(id?: string) {
  const queryClient = useQueryClient();
  return useMutation<LoanApplication, Error, void>({
    mutationFn: () => api<LoanApplication>(`/api/applications/${id}/submit`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

export function useDecision(id?: string) {
  const queryClient = useQueryClient();
  return useMutation<LoanApplication, Error, DecisionRequest>({
    mutationFn: (decision) =>
      api<LoanApplication>(`/api/applications/${id}/decision`, { method: 'POST', body: decision }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}
