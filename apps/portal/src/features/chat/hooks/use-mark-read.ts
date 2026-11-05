'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clearRoomUnread } from '@/lib/chat-unread';

type Input = {
  roomId: string | undefined;
  groupId: string;
  unread: number;
  latestId: string | undefined;
  markRead: (roomId: string) => Promise<unknown>;
};
type Request = { roomId: string; groupId: string; key: string };

/** BR-461: one attempt per room/message, one flight and a trailing burst update. */
export function useMarkRead(input: Input): void {
  const qc = useQueryClient();
  const latest = useRef(input);
  const attempted = useRef(new Map<string, string>());
  const previous = useRef<{ roomId: string | undefined; latestId: string | undefined }>(null);
  const running = useRef(false);
  const pending = useRef<Request | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    latest.current = input;
  }, [input]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.current = null;
    };
  }, []);

  useEffect(() => {
    const { roomId, groupId, unread, latestId } = latest.current;
    const before = previous.current;
    previous.current = { roomId, latestId };
    pending.current = null;
    if (!roomId) return;
    const key = `${roomId}|${latestId ?? ''}`;
    const switched = before?.roomId !== roomId;
    const changed = !switched && latestId !== undefined && before?.latestId !== latestId;
    if (attempted.current.get(roomId) === key) return;
    if (switched && unread <= 0) {
      attempted.current.set(roomId, key);
      return;
    }
    if (!switched && !changed) return;
    const request = { roomId, groupId, key };

    const send = async (next: Request): Promise<void> => {
      if (!mounted.current || latest.current.roomId !== next.roomId) return;
      if (attempted.current.get(next.roomId) === next.key) return;
      if (running.current) {
        pending.current = next;
        return;
      }
      attempted.current.set(next.roomId, next.key);
      running.current = true;
      clearRoomUnread(qc, next.groupId, next.roomId);
      try {
        await latest.current.markRead(next.roomId);
      } catch {
        /* Mutation onSettled refetches once; this key is never retried. */
      } finally {
        running.current = false;
        const queued = pending.current;
        pending.current = null;
        if (queued) void send(queued);
      }
    };
    if (switched) {
      void send(request);
      return;
    }
    const timer = setTimeout(() => void send(request), 300);
    return () => clearTimeout(timer);
  }, [input.roomId, input.groupId, input.latestId, qc]);
}
