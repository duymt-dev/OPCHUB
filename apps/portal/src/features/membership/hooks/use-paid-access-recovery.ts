'use client';

import type { QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { isActive } from '../model';

/** Recover only reads previously denied by the membership gate, on actual activation. */
export function usePaidAccessRecovery(qc: QueryClient): void {
  useEffect(
    () =>
      useAuthStore.subscribe((current, previous) => {
        if (
          !current.me ||
          !current.accessToken ||
          current.me.id !== previous.me?.id ||
          isActive(previous.me.membershipFee?.status) ||
          !isActive(current.me.membershipFee?.status)
        )
          return;
        void qc.invalidateQueries({
          predicate: (query) => {
            const error = query.state.error;
            return (
              error instanceof ApiError &&
              error.status === 402 &&
              error.code === 'MEMBERSHIP_REQUIRED'
            );
          },
        });
      }),
    [qc],
  );
}
