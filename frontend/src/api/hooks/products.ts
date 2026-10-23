import { useQuery } from '@tanstack/react-query';
import { api } from '../client';
import type { LoanProduct, ProductQuery } from '../types';

export function useProducts(query: ProductQuery = {}) {
  return useQuery<LoanProduct[], Error>({
    queryKey: ['products', query],
    queryFn: () =>
      api<LoanProduct[]>('/api/products', {
        query: {
          q: query.q,
          loanType: query.loanType,
          segment: query.segment,
          minAmount: query.minAmount,
          maxAmount: query.maxAmount,
          sort: query.sort,
        },
      }),
  });
}

export function useProduct(productId?: string) {
  return useQuery<LoanProduct, Error>({
    queryKey: ['product', productId],
    queryFn: () => api<LoanProduct>(`/api/products/${productId}`),
    enabled: Boolean(productId),
  });
}

export function useCompareProducts(ids: string[]) {
  return useQuery<LoanProduct[], Error>({
    queryKey: ['compare', ids],
    queryFn: () => api<LoanProduct[]>('/api/products/compare', { query: { ids: ids.join(',') } }),
    enabled: ids.length >= 2 && ids.length <= 4,
  });
}
