'use client';

import type { QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

/** Mock-only hint transport; public data always comes back through the ordinary authenticated API. */
export function useMockRoomReload(
  qc: QueryClient,
  enabled: boolean,
  reload: (qc: QueryClient, roomId: string) => Promise<void>,
): void {
  useEffect(() => {
    if (!enabled) return undefined;
    let mounted = true;
    let unsubscribe: (() => void) | undefined;
    void import('@opchub/shared/mock-affiliate-browser').then(({ subscribeMockChatRooms }) => {
      if (mounted)
        unsubscribe = subscribeMockChatRooms((rooms) => {
          for (const roomId of rooms) void reload(qc, roomId);
        });
    });
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [qc, enabled, reload]);
}
