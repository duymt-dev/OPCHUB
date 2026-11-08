'use client';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useAuthStore } from '@/lib/auth-store';
import { affiliateKeys, fetchMyRegion } from '../api';

/** Optional enhancement: failures never replace the ordinary affiliate screen. */
export function useMyRegion() {
  const userId = useAuthStore((s) => s.me?.id);
  const query = useQuery({ queryKey: [...affiliateKeys.region, userId], queryFn: fetchMyRegion });
  useEffect(() => {
    if (query.isError) logger.error('affiliate.my-region', new Error('GET /me/gdv failed'));
  }, [query.isError, query.errorUpdatedAt]);
  return query;
}
