'use client';

import { type ChatUnread, chatUnreadSchema } from '@opchub/shared/api-domains';
import { serverEvents } from '@opchub/shared/socket';
import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { getSocket, realtimeEnabled } from '@/lib/socket';

/**
 * NA-25 (REQ-225): số chưa đọc dùng chung cho menu "Chat nhóm" (shell) và rail nhóm / danh sách
 * chủ đề (chat). Một query `GET /me/chat/unread`; socket `unread.bump` (room `group:{id}`) tự +1
 * khi tin không phải của mình và không đang mở chủ đề đó. MSW không có kênh đẩy → làm mới 3 giây.
 */
export const chatUnreadKey = ['chat', 'unread'] as const;
const POLL_MS = 3_000;

/** Chủ đề đang mở (chat cập nhật) — tin vào đây không tăng số */
let openRoom: string | null = null;
export const setOpenRoom = (roomId: string | null) => {
  openRoom = roomId;
};

const fetchUnread = () => api('/me/chat/unread', { schema: chatUnreadSchema });

/** Trừ số của một phòng ngay khi mở (POST /rooms/:id/read chạy song song) */
export function clearRoomUnread(qc: QueryClient, groupId: string, roomId: string): void {
  qc.setQueryData<ChatUnread>(chatUnreadKey, (old) => {
    const n = old?.byRoom[roomId] ?? 0;
    return old && n ? bump(old, roomId, groupId, -n) : old;
  });
}

function bump(old: ChatUnread, roomId: string, groupId: string, d: number): ChatUnread {
  return {
    total: Math.max(0, old.total + d),
    byGroup: { ...old.byGroup, [groupId]: Math.max(0, (old.byGroup[groupId] ?? 0) + d) },
    byRoom: { ...old.byRoom, [roomId]: Math.max(0, (old.byRoom[roomId] ?? 0) + d) },
  };
}

export function useChatUnread() {
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.me?.id ?? null);
  const q = useQuery({
    queryKey: chatUnreadKey,
    queryFn: fetchUnread,
    enabled: me !== null,
    refetchInterval: realtimeEnabled ? false : POLL_MS,
    refetchIntervalInBackground: false,
  });
  const groups = Object.keys(q.data?.byGroup ?? {})
    .sort()
    .join(',');

  useEffect(() => {
    if (!realtimeEnabled || !groups) return undefined;
    const s = getSocket();
    const watch = () => void s.emit('groups.watch', { groupIds: groups.split(',') });
    const onBump = (raw: unknown) => {
      const p = serverEvents['unread.bump'].safeParse(raw);
      if (!p.success || p.data.senderId === me || p.data.roomId === openRoom) return;
      const { roomId, groupId } = p.data;
      qc.setQueryData<ChatUnread>(chatUnreadKey, (old) => old && bump(old, roomId, groupId, 1));
    };
    watch();
    s.on('connect', watch);
    s.on('unread.bump', onBump);
    return () => {
      s.off('connect', watch);
      s.off('unread.bump', onBump);
    };
  }, [qc, groups, me]);

  return q.data;
}
