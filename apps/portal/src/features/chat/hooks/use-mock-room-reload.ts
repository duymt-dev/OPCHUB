'use client';

import type { QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

/** Background timer throttling can restart MSW's worker and lose its active-client set.
 * Reactivate this document before a storage-triggered read, using MSW's local protocol.
 * No data/auth is supplied by this hint; the ordinary handler still authorizes the read.
 */
export async function activateMockRoomClient(signal?: AbortSignal): Promise<void> {
  const serviceWorker = navigator.serviceWorker;
  const controller = serviceWorker?.controller;
  if (!controller || signal?.aborted) return;
  await new Promise<void>((resolve) => {
    const done = () => {
      serviceWorker.removeEventListener('message', receive);
      signal?.removeEventListener('abort', done);
      resolve();
    };
    const receive = (event: MessageEvent<unknown>) => {
      if (
        event.source !== controller ||
        !event.data ||
        typeof event.data !== 'object' ||
        !('type' in event.data) ||
        event.data.type !== 'MOCKING_ENABLED'
      )
        return;
      done();
    };
    serviceWorker.addEventListener('message', receive);
    signal?.addEventListener('abort', done, { once: true });
    controller.postMessage('MOCK_ACTIVATE');
  });
}

/** Mock-only hint transport; public data always comes back through the ordinary authenticated API. */
export function useMockRoomReload(
  qc: QueryClient,
  enabled: boolean,
  reload: (qc: QueryClient, roomId: string) => Promise<void>,
): void {
  useEffect(() => {
    if (!enabled) return undefined;
    let mounted = true;
    const lifetime = new AbortController();
    let unsubscribe: (() => void) | undefined;
    void import('@opchub/shared/mock-affiliate-browser').then(({ subscribeMockChatRooms }) => {
      if (mounted)
        unsubscribe = subscribeMockChatRooms((rooms) => {
          void activateMockRoomClient(lifetime.signal).then(async () => {
            if (!mounted) return;
            await Promise.all(rooms.map((roomId) => reload(qc, roomId)));
          });
        });
    });
    return () => {
      mounted = false;
      lifetime.abort();
      unsubscribe?.();
    };
  }, [qc, enabled, reload]);
}
