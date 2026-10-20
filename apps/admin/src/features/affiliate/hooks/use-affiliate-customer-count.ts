'use client';

import { useQuery } from '@tanstack/react-query';
import { useCan } from '@/lib/permissions';
import { affiliateKeys, fetchAffiliateCustomers } from '../api';

/** History includes cancelled customers; converted statistics are not its total. */
export function useAffiliateCustomerCount(id: string) {
  const allowed = useCan('affiliate.view');
  const page = { page: 1, size: 1 };
  return useQuery({
    queryKey: affiliateKeys.customers(id, page),
    queryFn: () => fetchAffiliateCustomers(id, page),
    select: (data) => data.total,
    enabled: allowed && !!id,
  });
}
