import { chatMessageSchema } from '@opchub/shared/api-domains';
import type { ChatMessage, SendMessageRequest } from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';

/**
 * Lớp transport của chat (S-01 → S-12). REST (MSW) ở đây; Socket.IO ở `socket-transport.ts` —
 * cùng interface nên hook/UI không đổi.
 * Mọi kết quả ack đều parse lại bằng zod (dữ liệu từ ngoài vào).
 */
export interface ChatTransport {
  /** S-12: ack chỉ về sau khi server commit; gửi lại cùng clientMsgId không nhân bản tin */
  send(roomId: string, msg: SendMessageRequest): Promise<ChatMessage>;
  react(messageId: string, emoji: string): Promise<ChatMessage>;
  pin(messageId: string, pinned: boolean): Promise<ChatMessage>;
  /** S-02: vào/rời phòng; trả hàm huỷ đăng ký `message.new` */
  join(
    roomId: string,
    onMessage: (m: ChatMessage, event?: 'message.new' | 'message.updated') => void,
  ): () => void;
}

export const restTransport: ChatTransport = {
  send: (roomId, body) =>
    api(`/rooms/${roomId}/messages`, { method: 'POST', body, schema: chatMessageSchema }),
  react: (messageId, emoji) =>
    api(`/messages/${messageId}/reactions`, {
      method: 'POST',
      body: { emoji },
      schema: chatMessageSchema,
    }),
  pin: (messageId, pinned) =>
    api(`/messages/${messageId}/pin`, {
      method: 'PUT',
      body: { pinned },
      schema: chatMessageSchema,
    }),
  /** REST không có kênh đẩy — tin của người khác lấy khi tải lại phòng */
  join: () => () => undefined,
};

export const newClientMsgId = () => crypto.randomUUID();
