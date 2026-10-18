'use client';

import { serverEvents } from '@opchub/shared/socket';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { refreshSession } from './session';
import { endSession, setSessionEndNavigator } from './session-end';
import { getSocket, realtimeEnabled, resetSocket } from './socket';

/**
 * NA-16 bước 4: server đẩy `session.revoked {reason}` vào `user:{id}` rồi ngắt socket →
 * xoá phiên, về `/login?reason=<reason>`. MSW không có socket: REST 403 khoá làm việc này.
 * `password_changed`: thiết bị vừa tự đổi mật khẩu được server giữ phiên (`keepFamilyId`) — refresh
 * được thì ở lại, chỉ các thiết bị khác mới về đăng nhập.
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
      const { reason } = parsed.data;
      void (reason === 'password_changed' ? refreshSession() : Promise.resolve(false)).then(
        (kept) => {
          // Server ngắt socket chủ động (không tự nối lại): giữ phiên → nối lại cùng socket,
          // giữ listener chat/thông báo; handshake lấy token mới
          if (kept) s.connect();
          else {
            resetSocket();
            endSession(reason);
          }
        },
      );
    };
    s.on('session.revoked', onRevoked);
    return () => {
      s.off('session.revoked', onRevoked);
      setSessionEndNavigator(null);
    };
  }, [router]);
}
