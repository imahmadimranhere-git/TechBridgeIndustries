import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { clientsApi, dealsApi, invoicesApi, staffApi } from '../api/endpoints.js';

/** Clients for a searchable dropdown */
export function useClientOptions(search = '', { enabled = true } = {}) {
  return useQuery({
    queryKey: ['client-options', search],
    queryFn: () => clientsApi.list({ search, limit: 50, sort: 'name' }),
    select: (data) => data.items,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    enabled,
  });
}

/** Deals (optionally of one client) with their remaining amount */
export function useDealOptions({ clientId = '', search = '' } = {}, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['deal-options', clientId, search],
    queryFn: () => dealsApi.list({ clientId, search, limit: 100 }),
    select: (data) => data.items,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    enabled,
  });
}

/** Invoices of one deal with their balance due */
export function useInvoiceOptions({ dealId = '' } = {}, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['invoice-options', dealId],
    queryFn: () => invoicesApi.list({ dealId, range: 'all_time', limit: 100 }),
    select: (data) => data.items,
    staleTime: 30_000,
    enabled: enabled && Boolean(dealId),
  });
}

/** Active staff with their default commission */
export function useStaffOptions({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['staff', 'options'],
    queryFn: () => staffApi.list({ status: 'Active', limit: 100 }),
    select: (data) => data.items,
    staleTime: 60_000,
    enabled,
  });
}