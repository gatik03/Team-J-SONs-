import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import type { CustomerProfile, CustomerProfileUpdate } from '../types';

export function useProfile() {
  return useQuery<CustomerProfile, Error>({
    queryKey: ['profile'],
    queryFn: () => api<CustomerProfile>('/api/customers/me'),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation<CustomerProfile, Error, CustomerProfileUpdate>({
    mutationFn: (update) => api<CustomerProfile>('/api/customers/me', { method: 'PUT', body: update }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
