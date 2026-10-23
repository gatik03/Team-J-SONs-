import { useQuery } from '@tanstack/react-query';
import { api } from '../client';
import type { KnowledgeDocument } from '../types';

export function useKnowledgeDocuments() {
  return useQuery<KnowledgeDocument[], Error>({
    queryKey: ['knowledge'],
    queryFn: () => api<KnowledgeDocument[]>('/api/knowledge/documents'),
  });
}
