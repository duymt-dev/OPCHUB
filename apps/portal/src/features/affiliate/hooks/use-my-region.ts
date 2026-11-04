'use client';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { affiliateKeys, fetchMyRegion } from '../api';

/** Optional enhancement: failures never replace the ordinary affiliate screen. */
export function useMyRegion() {
  const userId = useAuthStore((s) => s.me?.id);
  const query = useQuery({ queryKey: [...affiliateKeys.region, userId], queryFn: fetchMyRegion });
  useEffect(() => {
    // There is no installed client logger in this app: use the browser's global error reporter,
    // without including the response, account/bank data or authentication details.
    if (query.isError && typeof globalThis.reportError === 'function')
      globalThis.reportError(new Error('GET /me/gdv failed'));
  }, [query.isError, query.errorUpdatedAt]);
  return query;
}
