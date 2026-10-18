'use client';

import { serverEvents } from '@opchub/shared/socket';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { endSession, setSessionEndNavigator } from './session-end';
import { getSocket, realtimeEnabled, resetSocket } from './socket';

/**
 * NA-16 bước 4: server đẩy `session.revoked {reason}` vào `user:{id}` rồi ngắt socket →
 * xoá phiên, về `/login?reason=<reason>`. MSW không có socket: REST 403 khoá làm việc này.
 */
export function useSessionRevoked(): void {
  const router = useRouter();
  useEffect(() => {
    setSessionEndNavigator((href) => router.replace(href));
    if (!realtimeEnabled) return () => setSessionEndNavigator(null);
    const s = getSocket();
    const onRevoked = (raw: unknown) => {
      const parsed = serverEvents['session.revoked'].safeParse(raw);
      if (!parsed.success) return;
      resetSocket();
      endSession(parsed.data.reason);
    };
    s.on('session.revoked', onRevoked);
    return () => {
      s.off('session.revoked', onRevoked);
      setSessionEndNavigator(null);
    };
  }, [router]);
}
