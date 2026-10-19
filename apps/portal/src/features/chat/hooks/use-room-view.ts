'use client';

import type { ChatOverview, ChatUnread } from '@opchub/shared/api-domains';
import { useMemo } from 'react';
import { useChatUnread } from '@/lib/chat-unread';
import type { ChatGroup, ChatLocation, ChatMessage, MessageView } from '../types';
import { useChatOverview, useMessages, useRooms } from './use-chat-data';

/** Giải nhóm/phòng đang xem từ URL + dữ liệu (nhóm lạ / phòng lạ → mặc định) */
export function useLocation(groupId: string | null, roomKey: string | null) {
  const raw = useChatOverview();
  // NA-25: số đỏ nhóm / chủ đề lấy từ bộ đếm dùng chung (cùng nguồn menu Chat nhóm, cập nhật realtime)
  const unread = useChatUnread();
  const overview = withUnread(raw, unread);
  const joined = useMemo(() => overview.data?.joined ?? [], [overview.data]);
  const group: ChatGroup | null = joined.find((g) => g.id === groupId) ?? joined[0] ?? null;
  const rooms = useRooms(group?.id ?? null);
  const list = useMemo(
    () => (rooms.data ?? []).map((r) => ({ ...r, unread: unread?.byRoom[r.id] ?? r.unread })),
    [rooms.data, unread],
  );
  const room =
    list.find((r) => r.key === (roomKey ?? 'general')) ?? list.find((r) => r.isDefault) ?? null;
  const loc: ChatLocation = { group, room, rooms: list };
  return { overview, loc, ready: overview.isSuccess && (!group || rooms.isSuccess) };
}

function withUnread<T extends { data?: ChatOverview | undefined }>(
  q: T,
  u: ChatUnread | undefined,
): T {
  if (!q.data || !u) return q;
  const joined = q.data.joined.map((g) => ({ ...g, unread: u.byGroup[g.id] ?? g.unread }));
  return { ...q, data: { ...q.data, joined } };
}

/** Tin cũ → mới, gộp đầu tin liền nhau cùng người gửi; đánh dấu tin khớp tìm kiếm */
export function useMessageViews(roomId: string | null, meId: string, q: string) {
  const query = useMessages(roomId, '');
  const views = useMemo(() => {
    const all: ChatMessage[] = (query.data?.pages ?? []).flatMap((p) => p.items).reverse();
    const needle = q.trim().toLowerCase();
    return all.map<MessageView>((msg, i) => {
      const prev = all[i - 1];
      const text = `${msg.body} ${msg.attachment?.name ?? ''}`.toLowerCase();
      return {
        msg,
        showHead: !prev || prev.sender.name !== msg.sender.name || Boolean(msg.replyTo),
        mine: msg.senderId === meId,
        match: !needle || text.includes(needle),
      };
    });
  }, [query.data, q, meId]);
  const hits = q.trim() ? views.filter((v) => v.match).length : 0;
  return { views, hits, query };
}
