import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../client';
import type { EmiRequest, EmiResult } from '../types';

export function useEmi(input: EmiRequest | null) {
  return useQuery<EmiResult, Error>({
    queryKey: ['emi', input],
    queryFn: () => api<EmiResult>('/api/emi/calculate', { method: 'POST', body: input }),
    enabled: Boolean(input && input.principal > 0 && input.annualRate > 0 && input.tenureMonths > 0),
    placeholderData: keepPreviousData,
  });
}
