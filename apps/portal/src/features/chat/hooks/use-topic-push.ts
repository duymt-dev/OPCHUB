'use client';

import { serverEvents } from '@opchub/shared/socket';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getSocket, realtimeEnabled } from '@/lib/socket';
import { chatKeys } from '../api';

/**
 * NA-09: Admin thêm chủ đề → server phát `room.created` vào các phòng socket của nhóm → tải lại
 * danh sách chủ đề + tổng quan (không tải lại trang). MSW không có server đẩy nên bỏ qua.
 */
export function useTopicPush(): void {
  const qc = useQueryClient();
  useEffect(() => {
    if (!realtimeEnabled) return undefined;
    const s = getSocket();
    const onCreated = (raw: unknown) => {
      const p = serverEvents['room.created'].safeParse(raw);
      if (!p.success) return;
      void qc.invalidateQueries({ queryKey: chatKeys.rooms(p.data.groupId) });
      void qc.invalidateQueries({ queryKey: chatKeys.overview() });
    };
    s.on('room.created', onCreated);
    return () => {
      s.off('room.created', onCreated);
    };
  }, [qc]);
}
