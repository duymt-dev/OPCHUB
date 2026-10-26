import type { MessageKind } from '@opchub/db';
import { attachmentSchema, type ChatMessage, type Message } from '@opchub/shared/api-domains';

/** Tên hiển thị tin không có người gửi (tin hệ thống: duyệt vào nhóm, D-43) */
export const SYSTEM_SENDER = 'Hệ thống';

/** Dòng tin đã join đủ dữ liệu để dựng DTO — 1 query cho cả trang (không N+1) */
export interface MessageRow {
  id: string;
  room_id: string;
  sender_id: string | null;
  sender_name: string | null;
  sender_avatar: string | null;
  persona_id: string | null;
  sender_is_owner: boolean;
  kind: MessageKind;
  body: string;
  attachment: unknown;
  client_msg_id: string | null;
  is_simulated: boolean;
  created_at: Date;
  reply_name: string | null;
  reply_body: string | null;
  reply_kind: MessageKind | null;
  reply_attachment: unknown;
  pinned: boolean;
  /** `[{emoji, names[]}]` gom theo emoji, thứ tự emoji xuất hiện đầu */
  reactions: { emoji: string; names: string[] }[] | null;
  my_reactions: string[] | null;
  reported_by_me: boolean;
  hidden_at?: Date | null;
}

const attachmentOf = (raw: unknown) => {
  const r = attachmentSchema.safeParse(raw);
  return r.success ? r.data : null;
};

/** Xem trước một dòng (ghim, tin cuối, trả lời) */
export function previewText(kind: MessageKind, body: string, attachment: unknown): string {
  if (kind === 'image') return '[Ảnh]';
  return body || attachmentOf(attachment)?.name || '';
}

function base(r: MessageRow) {
  return {
    id: r.id,
    roomId: r.room_id,
    sender: { name: r.sender_name ?? SYSTEM_SENDER, avatarUrl: r.sender_avatar },
    body: r.body,
    attachment: r.kind === 'text' ? null : attachmentOf(r.attachment),
    reactions: (r.reactions ?? []).map((x) => ({
      emoji: x.emoji,
      count: x.names.length,
      names: x.names,
    })),
    pinned: r.pinned,
    createdAt: r.created_at.toISOString(),
  };
}

/** DTO Portal theo góc nhìn người gọi — D-48: KHÔNG có `isSimulated` */
export function toChatMessage(r: MessageRow): ChatMessage {
  const isSystem = r.sender_id === null && r.persona_id === null;
  return {
    ...base(r),
    ...(r.hidden_at
      ? {
          body: '',
          attachment: null,
          reactions: [],
          pinned: false,
          hiddenAt: r.hidden_at.toISOString(),
        }
      : {}),
    kind: r.kind,
    senderId: r.sender_id,
    senderRole: isSystem ? 'system' : r.sender_is_owner ? 'owner' : null,
    replyTo:
      !r.hidden_at && r.reply_kind !== null
        ? {
            name: r.reply_name ?? SYSTEM_SENDER,
            text: previewText(r.reply_kind, r.reply_body ?? '', r.reply_attachment),
          }
        : null,
    // V4-612: tin ẩn vẫn giữ nhãn "Bạn đã báo cáo tin này" cho người báo (prototype v4)
    reportedByMe: r.reported_by_me,
    myReactions: r.hidden_at ? [] : (r.my_reactions ?? []),
    clientMsgId: r.client_msg_id,
  };
}

/** DTO Admin xem chat chỉ đọc (D-26) — có `isSimulated` (D-48) */
export function toAdminMessage(r: MessageRow): Message {
  return { ...base(r), isSimulated: r.is_simulated, hiddenAt: r.hidden_at?.toISOString() ?? null };
}
