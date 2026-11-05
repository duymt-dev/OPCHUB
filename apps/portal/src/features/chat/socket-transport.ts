import { clientEvents, serverEvents } from '@opchub/shared/socket';
import type { ClientEventName } from '@opchub/shared/socket';
import type { z } from 'zod';
import { ApiError } from '@/lib/api-client';
import { getSocket, realtimeEnabled } from '@/lib/socket';
import { restTransport, type ChatTransport } from './transport';

type AckOf<E extends ClientEventName> = z.infer<(typeof clientEvents)[E]['ack']>;
type DataOf<E extends ClientEventName> = Extract<AckOf<E>, { ok: true }>['data'];

/**
 * Parse payload theo hợp đồng trước khi gửi (vd emoji ngoài danh sách → lỗi ngay ở client),
 * emitWithAck, parse ack bằng zod; ack lỗi → ApiError cùng mã với REST.
 */
async function call<E extends ClientEventName>(event: E, input: unknown): Promise<DataOf<E>> {
  const def = clientEvents[event];
  const payload: unknown = def.payload.parse(input);
  const raw: unknown = await getSocket().timeout(10_000).emitWithAck(event, payload);
  const res = def.ack.parse(raw) as AckOf<E>;
  if (!res.ok) throw new ApiError(res.error.code, 0, res.error.message);
  return (res as Extract<AckOf<E>, { ok: true }>).data;
}

/** Transport Socket.IO (S-02, S-12) — dùng khi NEXT_PUBLIC_API_MOCKING=off */
export const socketTransport: ChatTransport = {
  send: (roomId, msg) => call('message.send', { ...msg, roomId }),
  react: (messageId, emoji) => call('message.react', { messageId, emoji }),
  pin: (messageId, pinned) => call('message.pin', { messageId, pinned }),
  join: (roomId, onMessage) => {
    const s = getSocket();
    const onEvent = (event: 'message.new' | 'message.updated', raw: unknown) => {
      const parsed = serverEvents[event].safeParse(raw);
      if (parsed.success && parsed.data.roomId === roomId) onMessage(parsed.data, event);
    };
    const onNew = (raw: unknown) => onEvent('message.new', raw);
    const onUpdated = (raw: unknown) => onEvent('message.updated', raw);
    const doJoin = () => void call('room.join', { roomId }).catch(() => undefined);
    s.on('message.new', onNew);
    s.on('message.updated', onUpdated);
    s.on('connect', doJoin);
    if (s.connected) doJoin();
    return () => {
      s.off('message.new', onNew);
      s.off('message.updated', onUpdated);
      s.off('connect', doJoin);
      void call('room.leave', { roomId }).catch(() => undefined);
    };
  },
};

/** MSW → REST (không có server đẩy); API thật → Socket.IO. Socket chỉ kết nối ở lần dùng đầu. */
export const defaultTransport: ChatTransport = realtimeEnabled ? socketTransport : restTransport;
