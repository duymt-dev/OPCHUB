'use client';

import { serverEvents } from '@opchub/shared/socket';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getSocket, realtimeEnabled } from '@/lib/socket';
import { chatKeys } from '../api';
import { useMockRoomReload } from './use-mock-room-reload';

/** Drop stale content before refetch; a bulk event intentionally carries no persona IDs. */
export async function reloadChatRoom(qc: QueryClient, roomId: string): Promise<void> {
  const keys = [chatKeys.roomMessages(roomId), chatKeys.pins(roomId), chatKeys.groupFilesAll()];
  await Promise.all(keys.map((queryKey) => qc.cancelQueries({ queryKey })));
  await Promise.all([
    ...keys.map((queryKey) => qc.resetQueries({ queryKey })),
    qc.invalidateQueries({ queryKey: chatKeys.overview() }),
    qc.invalidateQueries({ queryKey: [...chatKeys.all, 'rooms'] }),
  ]);
}

/** Mock storage hints must not clear an observed list before a fresh API read succeeds. */
export async function reloadMockChatRoom(qc: QueryClient, roomId: string): Promise<void> {
  const keys = [chatKeys.roomMessages(roomId), chatKeys.pins(roomId), chatKeys.groupFilesAll()];
  await Promise.all(keys.map((queryKey) => qc.cancelQueries({ queryKey })));
  await Promise.all([
    ...keys.map((queryKey) => qc.invalidateQueries({ queryKey })),
    qc.invalidateQueries({ queryKey: chatKeys.overview() }),
    qc.invalidateQueries({ queryKey: [...chatKeys.all, 'rooms'] }),
  ]);
}

export function useRoomReload(): void {
  const qc = useQueryClient();
  useMockRoomReload(qc, !realtimeEnabled, reloadMockChatRoom);
  useEffect(() => {
    if (!realtimeEnabled) return undefined;
    const socket = getSocket();
    const reload = (raw: unknown) => {
      const parsed = serverEvents['room.reload'].safeParse(raw);
      if (parsed.success) void reloadChatRoom(qc, parsed.data.roomId);
    };
    const updated = (raw: unknown) => {
      const parsed = serverEvents['message.updated'].safeParse(raw);
      if (parsed.success && parsed.data.hiddenAt) void reloadChatRoom(qc, parsed.data.roomId);
    };
    socket.on('room.reload', reload);
    socket.on('message.updated', updated);
    return () => {
      socket.off('room.reload', reload);
      socket.off('message.updated', updated);
    };
  }, [qc]);
}
