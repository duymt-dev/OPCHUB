'use client';

import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';

/** AU-09: per-account server state must never survive a login/logout identity boundary.
 * Subscribe synchronously: a React effect after the new account renders would be too late.
 * Token refresh / fee updates of the same account do not clear its active queries.
 */
export function bindSessionQueryCache(client: QueryClient) {
  return useAuthStore.subscribe((state, previous) => {
    if (state.me?.id !== previous.me?.id) client.clear();
  });
}

export function SessionQueryBoundary() {
  const client = useQueryClient();
  useEffect(() => bindSessionQueryCache(client), [client]);
  return null;
}
