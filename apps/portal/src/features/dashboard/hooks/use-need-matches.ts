'use client';

import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { fetchNeedMatches, needMatchKeys } from '../api';

export function useNeedMatches() {
  const me = useAuthStore((s) => s.me);
  const enabled = !!me && me.accountType === 'business';
  const query = useQuery({
    queryKey: needMatchKeys.mine(me?.id),
    queryFn: fetchNeedMatches,
    enabled,
    staleTime: 60_000,
    retry: false,
  });
  const denied = query.error instanceof ApiError && [401, 402, 403].includes(query.error.status);
  return { ...query, hidden: !enabled || denied || query.data?.hasStore === false };
}
