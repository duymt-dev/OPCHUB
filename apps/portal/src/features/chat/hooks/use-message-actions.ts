'use client';

import type { ChatMessage, ChatMessagePage, SendMessageRequest } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect } from 'react';
import { chatKeys } from '../api';
import { defaultTransport } from '../socket-transport';
import { newClientMsgId, type ChatTransport } from '../transport';

type Pages = InfiniteData<ChatMessagePage, string | null>;

/** Chèn / thay tin trong mọi trang cache của phòng (không giữ bản sao danh sách riêng) */
export function upsertMessage(qc: QueryClient, m: ChatMessage, isNew = false) {
  for (const [key, old] of qc.getQueriesData<Pages>({
    queryKey: chatKeys.roomMessages(m.roomId),
  })) {
    qc.setQueryData<Pages>(key, upsertInto(old, m, key[3] === '' || key[3] === undefined, isNew));
  }
}

/**
 * V4-612 (D-77): tin thành viên bị ẩn giữ chỗ (câu "đã bị ẩn") trong luồng thường; tin bot ẩn và
 * kết quả tìm kiếm bỏ hẳn (như server). Chỉ first delivery/ack thành viên được chèn
 * placeholder mới; update/replay tin ẩn chưa có trong cache không chèn thêm.
 */
function upsertInto(
  old: Pages | undefined,
  m: ChatMessage,
  plain: boolean,
  isNew: boolean,
): Pages | undefined {
  if (!old) return old;
  const exists = old.pages.some((p) => p.items.some((x) => x.id === m.id));
  if (m.hiddenAt && !exists && (!isNew || !plain || !m.senderId)) return old;
  if (exists) {
    const drop = Boolean(m.hiddenAt) && (!plain || !m.senderId);
    const pages = old.pages.map((p) => ({
      ...p,
      items: drop
        ? p.items.filter((x) => x.id !== m.id)
        : p.items.map((x) => (x.id === m.id ? m : x)),
    }));
    return { ...old, pages };
  }
  const [first, ...rest] = old.pages;
  if (!first) return old;
  return { ...old, pages: [{ ...first, items: [m, ...first.items] }, ...rest] };
}

export interface SendArgs {
  kind: SendMessageRequest['kind'];
  body?: string;
  attachment?: SendMessageRequest['attachment'];
  replyTo?: string;
  mentions?: string[];
}

/** Gửi tin / cảm xúc / ghim qua transport (REST khi MSW, Socket.IO khi API thật) */
export function useMessageActions(
  roomId: string | null,
  transport: ChatTransport = defaultTransport,
) {
  const qc = useQueryClient();
  const toast = useToast();
  const t = useTranslations('chat');

  useEffect(() => {
    if (!roomId) return undefined;
    return transport.join(roomId, (m, event) => upsertMessage(qc, m, event === 'message.new'));
  }, [qc, roomId, transport]);

  const refreshRoom = useCallback(() => {
    void qc.invalidateQueries({ queryKey: chatKeys.overview() });
    if (roomId) void qc.invalidateQueries({ queryKey: chatKeys.pins(roomId) });
  }, [qc, roomId]);

  const onError = () => toast(t('toast.error'));

  const send = useMutation({
    mutationFn: (a: SendArgs) =>
      transport.send(roomId ?? '', { clientMsgId: newClientMsgId(), mentions: [], ...a }),
    onSuccess: (m) => {
      upsertMessage(qc, m, true);
      if (m.kind !== 'text') void qc.invalidateQueries({ queryKey: chatKeys.groupFilesAll() });
      refreshRoom();
    },
    onError,
  });

  const react = useMutation({
    mutationFn: (a: { id: string; emoji: string }) => transport.react(a.id, a.emoji),
    onSuccess: (m) => upsertMessage(qc, m),
    onError,
  });

  const pin = useMutation({
    mutationFn: (a: { id: string; pinned: boolean }) => transport.pin(a.id, a.pinned),
    onSuccess: (m, a) => {
      upsertMessage(qc, m);
      refreshRoom();
      toast(t(a.pinned ? 'pin.toastPinned' : 'pin.toastUnpinned'));
    },
    onError,
  });

  return {
    send: (a: SendArgs) => send.mutate(a),
    react: (id: string, emoji: string) => react.mutate({ id, emoji }),
    pin: (id: string, pinned: boolean) => pin.mutate({ id, pinned }),
  };
}
