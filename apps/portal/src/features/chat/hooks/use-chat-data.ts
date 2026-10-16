'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  chatKeys,
  fetchFiles,
  fetchMembers,
  fetchMessages,
  fetchOverview,
  fetchPins,
  fetchRequests,
  fetchRooms,
} from '../api';
import type { ChatGroup, PanelTab } from '../types';

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

export const useRoomFiles = (roomId: string | null, enabled: boolean) =>
  useQuery({
    queryKey: chatKeys.files(roomId ?? ''),
    queryFn: () => fetchFiles(roomId ?? ''),
    enabled: Boolean(roomId) && enabled,
  });

export const useJoinRequests = (groupId: string | null, enabled: boolean) =>
  useQuery({
    queryKey: chatKeys.requests(groupId ?? ''),
    queryFn: () => fetchRequests(groupId ?? ''),
    enabled: Boolean(groupId) && enabled,
  });

/** Dữ liệu bảng thông tin + gợi ý nhắc tên của một phòng; chỉ tải tab đang mở */
export function usePanelData(group: ChatGroup, roomId: string, panel: PanelTab | null) {
  const pins = useRoomPins(roomId).data ?? [];
  const members = useRoomMembers(roomId, true).data;
  const files = useRoomFiles(roomId, panel === 'files').data ?? [];
  const requests = useJoinRequests(group.id, group.isOwner && panel === 'members').data ?? [];
  return { pins, members, files, requests };
}
