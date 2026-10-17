import { z } from 'zod';
import { attachmentSchema, messageSchema } from './chat';
import { groupItemSchema, roomSchema } from './groups';

/**
 * SRS §13 Chat — phần Portal "Chat nhóm" (P-28 → P-48).
 * REST là đường chính khi chưa có socket; payload trùng sự kiện WS §13.4
 * (`message.send`, `message.react`, `message.pin`) để đổi transport không đổi hợp đồng.
 */

export const CHAT_EMOJIS = ['👍', '❤️', '😂', '😮', '🎉'] as const;
export const MESSAGE_KINDS = ['text', 'file', 'image'] as const;
/** D-48: không có vai trò "bot" — tin persona hiển thị như thành viên */
export const SENDER_ROLES = ['owner', 'system'] as const;
export type MessageKind = (typeof MESSAGE_KINDS)[number];

/** Nhóm trên rail chat: kèm số chưa đọc (S-04), số online (S-01), quyền chủ nhóm (D-43) */
export const chatGroupSchema = groupItemSchema.extend({
  thumbUrl: z.string(),
  coverUrl: z.string(),
  online: z.number().int(),
  unread: z.number().int(),
  isOwner: z.boolean(),
  pendingRequests: z.number().int(),
});
export type ChatGroup = z.infer<typeof chatGroupSchema>;

/** GET /me/chat */
export const chatOverviewSchema = z.object({
  joined: z.array(chatGroupSchema),
  others: z.array(chatGroupSchema),
});
export type ChatOverview = z.infer<typeof chatOverviewSchema>;

/** GET /me/groups/:id/rooms — phòng Chung + chủ đề, theo góc nhìn người gọi */
export const chatRoomSchema = roomSchema.extend({
  /** Đoạn cuối của id dùng trên URL `/chat/:groupId/:key` */
  key: z.string(),
  createdBy: z.string().nullable(),
  mine: z.boolean(),
  lastMessage: z.object({ senderName: z.string(), text: z.string() }).nullable(),
  unread: z.number().int(),
  online: z.number().int(),
  memberCount: z.number().int(),
});
export type ChatRoom = z.infer<typeof chatRoomSchema>;

export const replyRefSchema = z.object({ name: z.string(), text: z.string() });

/**
 * Tin trong phòng (DTO Portal) — mở rộng `messageSchema`.
 * D-48: bỏ `isSimulated` — Portal không biết tin nào do bot persona đăng.
 */
export const chatMessageSchema = messageSchema.omit({ isSimulated: true }).extend({
  kind: z.enum(MESSAGE_KINDS),
  senderId: z.string().nullable(),
  senderRole: z.enum(SENDER_ROLES).nullable(),
  replyTo: replyRefSchema.nullable(),
  reportedByMe: z.boolean(),
  myReactions: z.array(z.string()),
  clientMsgId: z.string().nullable(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatMessagePageSchema = z.object({
  items: z.array(chatMessageSchema),
  nextCursor: z.string().nullable(),
});
export type ChatMessagePage = z.infer<typeof chatMessagePageSchema>;

/** POST /rooms/:id/messages ≙ WS `message.send` (S-12: idempotent theo clientMsgId) */
export const sendMessageSchema = z
  .object({
    clientMsgId: z.string().min(1).max(64),
    kind: z.enum(MESSAGE_KINDS).default('text'),
    body: z.string().trim().max(4000).default(''),
    attachment: attachmentSchema.optional(),
    replyTo: z.string().optional(),
    mentions: z.array(z.string()).max(20).default([]),
  })
  .refine((v) => (v.kind === 'text' ? v.body.length > 0 : Boolean(v.attachment)), {
    message: 'Tin nhắn trống',
  });
export type SendMessageRequest = z.input<typeof sendMessageSchema>;

/** POST /messages/:id/reactions ≙ WS `message.react` — bật/tắt cảm xúc của người gọi */
export const reactMessageSchema = z.object({ emoji: z.enum(CHAT_EMOJIS) });

/** PUT /messages/:id/pin ≙ WS `message.pin` */
export const pinMessageSchema = z.object({ pinned: z.boolean() });

/** POST /groups/:id/rooms — thành viên tạo chủ đề */
export const createTopicSchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(120).optional(),
});
export type CreateTopicRequest = z.infer<typeof createTopicSchema>;

export const roomMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  avatarUrl: z.string().nullable(),
  online: z.boolean(),
  isModerator: z.boolean(),
});
export type RoomMember = z.infer<typeof roomMemberSchema>;

export const roomMembersSchema = z.object({
  items: z.array(roomMemberSchema),
  total: z.number().int(),
});

export const roomPinSchema = z.object({
  messageId: z.string(),
  senderName: z.string(),
  text: z.string(),
});
export type RoomPin = z.infer<typeof roomPinSchema>;

export const roomFileSchema = z.object({
  messageId: z.string(),
  name: z.string(),
  size: z.string(),
  ext: z.string(),
});
export type RoomFile = z.infer<typeof roomFileSchema>;
