'use client';

import { useMemo } from 'react';
import type { ChatGroup, ChatLocation, ChatMessage, MessageView } from '../types';
import { useChatOverview, useMessages, useRooms } from './use-chat-data';

/** Giải nhóm/phòng đang xem từ URL + dữ liệu (nhóm lạ / phòng lạ → mặc định) */
export function useLocation(groupId: string | null, roomKey: string | null) {
  const overview = useChatOverview();
  const joined = useMemo(() => overview.data?.joined ?? [], [overview.data]);
  const group: ChatGroup | null = joined.find((g) => g.id === groupId) ?? joined[0] ?? null;
  const rooms = useRooms(group?.id ?? null);
  const list = rooms.data ?? [];
  const room =
    list.find((r) => r.key === (roomKey ?? 'general')) ?? list.find((r) => r.isDefault) ?? null;
  const loc: ChatLocation = { group, room, rooms: list };
  return { overview, loc, ready: overview.isSuccess && (!group || rooms.isSuccess) };
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
