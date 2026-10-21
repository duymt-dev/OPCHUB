'use client';

import type { QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { fetchMembership, membershipKeys } from '../api';

/** Mock relay hints trigger the ordinary authenticated membership read, never broad polling. */
export function useMockMembershipPush(qc: QueryClient, enabled: boolean): void {
  const userId = useAuthStore((state) => state.me?.id);
  useEffect(() => {
    if (!enabled || !userId) return undefined;
    let mounted = true;
    let unsubscribe: (() => void) | undefined;
    const reload = async () => {
      try {
        const fee = await qc.fetchQuery({
          queryKey: membershipKeys.mine,
          queryFn: fetchMembership,
          staleTime: 0,
        });
        const { me, accessToken, setSession } = useAuthStore.getState();
        if (mounted && me?.id === userId && accessToken)
          setSession(accessToken, { ...me, membershipFee: fee });
      } catch {
        // Query retains the read error; a failed hint cannot grant membership or change session.
      }
    };
    void import('@opchub/shared/mock-affiliate-browser').then(({ subscribeMockMembership }) => {
      if (mounted) unsubscribe = subscribeMockMembership(userId, () => void reload());
    });
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [qc, enabled, userId]);
}
