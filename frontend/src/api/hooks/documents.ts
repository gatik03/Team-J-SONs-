import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import type { ApplicationDocument, DocumentType } from '../types';

export function useDocuments(id?: string) {
  return useQuery<ApplicationDocument[], Error>({
    queryKey: ['documents', id],
    queryFn: () => api<ApplicationDocument[]>(`/api/applications/${id}/documents`),
    enabled: Boolean(id),
  });
}

export function useUploadDocument(id?: string) {
  const queryClient = useQueryClient();
  return useMutation<ApplicationDocument, Error, { documentType: DocumentType; file: File }>({
    mutationFn: ({ documentType, file }) => {
      const form = new FormData();
      form.append('documentType', documentType);
      form.append('file', file);
      return api<ApplicationDocument>(`/api/applications/${id}/documents`, { method: 'POST', form });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', id] });
    },
  });
}
