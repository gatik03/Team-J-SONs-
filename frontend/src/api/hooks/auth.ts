import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../client';
import type { LoginRequest, LoginResponse, Me } from '../types';

export function useLogin() {
  return useMutation<LoginResponse, Error, LoginRequest>({
    mutationFn: (credentials) => api<LoginResponse>('/api/auth/login', { method: 'POST', body: credentials }),
  });
}

export function useMe() {
  return useQuery<Me, Error>({
    queryKey: ['me'],
    queryFn: () => api<Me>('/api/auth/me'),
  });
}
