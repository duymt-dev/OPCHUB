'use client';

import { serverEvents } from '@opchub/shared/socket';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getSocket, realtimeEnabled } from '@/lib/socket';
import { shellKeys } from '../api';

/**
 * SRS §13.4: server đẩy `notification.new` vào room `user:{id}` → tải lại chuông.
 * Thông báo sinh ở worker (outbox) nên đến sau phản hồi REST; MSW tự trả kèm nên bỏ qua.
 */
export function useNotificationPush(): void {
  const qc = useQueryClient();
  useEffect(() => {
    if (!realtimeEnabled) return undefined;
    const s = getSocket();
    const onNew = (raw: unknown) => {
      if (serverEvents['notification.new'].safeParse(raw).success) {
        void qc.invalidateQueries({ queryKey: shellKeys.notifications });
      }
    };
    s.on('notification.new', onNew);
    return () => {
      s.off('notification.new', onNew);
    };
  }, [qc]);
}
