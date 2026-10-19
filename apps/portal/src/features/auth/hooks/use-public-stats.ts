'use client';

import { publicStatsSchema } from '@opchub/shared/api';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

/** `GET /public/stats` (Public, cache server 60 giây) — số liệu màn đăng nhập (BUG-029, CR-15) */
export function usePublicStats() {
  return useQuery({
    queryKey: ['public', 'stats'],
    queryFn: () => api('/public/stats', { schema: publicStatsSchema }),
    staleTime: 60_000,
  }).data;
}
