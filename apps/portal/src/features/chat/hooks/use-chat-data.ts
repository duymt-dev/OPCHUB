'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { GroupFileKind } from '@opchub/shared/api-domains';
import {
  chatKeys,
  fetchGroupFiles,
  fetchMembers,
  fetchMessages,
  fetchOverview,
  fetchPins,
  fetchRooms,
} from '../api';

/** Query hook của Chat nhóm — component không tự gọi useQuery với key tự chế */

/** Rail nhóm: luôn tải lại khi vào màn (tham gia/rời nhóm xảy ra ở màn Cộng đồng) */
export const useChatOverview = () =>
  useQuery({ queryKey: chatKeys.overview(), queryFn: fetchOverview, staleTime: 0 });

export const useRooms = (groupId: string | null) =>
  useQuery({
    queryKey: chatKeys.rooms(groupId ?? ''),
    queryFn: () => fetchRooms(groupId ?? ''),
    enabled: Boolean(groupId),
  });

/** Lịch sử theo cursor `before` (keyset, mới → cũ) — trang đầu là tin mới nhất */
export const useMessages = (roomId: string | null, q: string) =>
  useInfiniteQuery({
    queryKey: chatKeys.messages(roomId ?? '', q),
    queryFn: ({ pageParam }) => fetchMessages(roomId ?? '', q, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: Boolean(roomId),
  });

export const useRoomMembers = (roomId: string | null, enabled: boolean) =>
  useQuery({
    queryKey: chatKeys.members(roomId ?? ''),
    queryFn: () => fetchMembers(roomId ?? ''),
    enabled: Boolean(roomId) && enabled,
  });

export const useRoomPins = (roomId: string | null) =>
  useQuery({
    queryKey: chatKeys.pins(roomId ?? ''),
    queryFn: () => fetchPins(roomId ?? ''),
    enabled: Boolean(roomId),
  });

/** D-98 "File chia sẻ": mọi chủ đề của nhóm, keyset `before` (mới → cũ), chip đếm theo toàn bộ */
export const useGroupFiles = (groupId: string, kind: GroupFileKind, q: string) =>
  useInfiniteQuery({
    queryKey: chatKeys.groupFiles(groupId, kind, q),
    queryFn: ({ pageParam }) => fetchGroupFiles(groupId, kind, q, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    placeholderData: (prev) => prev,
  });

/** Dữ liệu bảng thông tin + gợi ý nhắc tên của một phòng (tab File chia sẻ tự tải theo nhóm) */
export function usePanelData(roomId: string) {
  const pins = useRoomPins(roomId).data ?? [];
  const members = useRoomMembers(roomId, true).data;
  return { pins, members };
}
