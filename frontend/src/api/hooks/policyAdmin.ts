import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import type {
  PolicyDraftUpload,
  PolicyLibraryItem,
  PolicyPreviewSection,
  PolicyVersion,
  PolicyAnswer,
} from '../types';

export function usePolicyLibrary() {
  return useQuery<PolicyLibraryItem[], Error>({
    queryKey: ['policyLibrary'],
    queryFn: () => api<PolicyLibraryItem[]>('/api/admin/policies'),
  });
}

export function usePolicyVersions(documentKey?: string) {
  return useQuery<PolicyVersion[], Error>({
    queryKey: ['policyVersions', documentKey],
    queryFn: () => api<PolicyVersion[]>(`/api/admin/policies/${documentKey}/versions`),
    enabled: Boolean(documentKey),
  });
}

export function usePolicyPreview(documentId?: string) {
  return useQuery<PolicyPreviewSection[], Error>({
    queryKey: ['policyPreview', documentId],
    queryFn: () => api<PolicyPreviewSection[]>(`/api/admin/policies/versions/${documentId}/preview`),
    enabled: Boolean(documentId),
  });
}

export function useUploadPolicyDraft() {
  const queryClient = useQueryClient();
  return useMutation<PolicyVersion, Error, PolicyDraftUpload>({
    mutationFn: (draft) => {
      const form = new FormData();
      form.append('file', draft.file);
      form.append('documentKey', draft.documentKey);
      form.append('title', draft.title);
      form.append('version', draft.version);
      form.append('effectiveDate', draft.effectiveDate);
      form.append('loanType', draft.loanType);
      form.append('documentType', draft.documentType);
      form.append('audience', draft.audience);
      if (draft.customerSegment) {
        form.append('customerSegment', draft.customerSegment);
      }
      form.append('changeNote', draft.changeNote);

      return api<PolicyVersion>('/api/admin/policies', { method: 'POST', form });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policyLibrary'] });
      queryClient.invalidateQueries({ queryKey: ['policyVersions'] });
    },
  });
}

export function useTestAsk(documentId?: string) {
  return useMutation<PolicyAnswer, Error, { question: string }>({
    mutationFn: ({ question }) =>
      api<PolicyAnswer>(`/api/admin/policies/versions/${documentId}/test-ask`, {
        method: 'POST',
        body: { question },
      }),
  });
}

export function usePublishPolicy() {
  const queryClient = useQueryClient();
  return useMutation<PolicyVersion, Error, string>({
    mutationFn: (documentId) =>
      api<PolicyVersion>(`/api/admin/policies/versions/${documentId}/publish`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policyLibrary'] });
      queryClient.invalidateQueries({ queryKey: ['policyVersions'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
    },
  });
}

export function useRetirePolicy() {
  const queryClient = useQueryClient();
  return useMutation<PolicyVersion, Error, { documentId: string; reason: string }>({
    mutationFn: ({ documentId, reason }) =>
      api<PolicyVersion>(`/api/admin/policies/versions/${documentId}/retire`, {
        method: 'POST',
        body: { reason },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policyLibrary'] });
      queryClient.invalidateQueries({ queryKey: ['policyVersions'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
    },
  });
}
