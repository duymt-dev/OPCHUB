'use client';

import { useQuery } from '@tanstack/react-query';
import { useCan } from '@/lib/permissions';
import { fetchRevenueRetained, revenueKeys } from '../revenue-sharing-api';

export function useRetainedRevenue() {
  const allowed = useCan('affiliate.view');
  return useQuery({
    queryKey: revenueKeys.retained,
    queryFn: fetchRevenueRetained,
    enabled: allowed,
    // Refresh when returning from a receipt screen, even inside the default cache window.
    refetchOnMount: 'always',
  });
}
