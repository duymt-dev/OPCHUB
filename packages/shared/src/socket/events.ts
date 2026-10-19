import { z } from 'zod';
import { MEMBERSHIP_FEE_STATUS } from '../enums';
import {
  chatMessageSchema,
  pinMessageSchema,
  reactMessageSchema,
  sendMessageSchema,
} from '../api-domains/chat-room';
import { notificationSchema } from '../api-domains/settings';
import { ERROR_CODES } from '../errors';

/**
 * Hợp đồng Socket.IO (SRS §13.4, realtime/socket-chat.md, S-01 → S-12).
 * Server, client và test cùng parse bằng các schema dưới — dữ liệu từ ngoài vào.
 */

const roomRef = z.object({ roomId: z.string().min(1) });
const messageRef = z.object({ messageId: z.string().min(1) });

/** Lỗi trong ack — cùng mã với REST */
export const socketAckErrorSchema = z.object({
  ok: z.literal(false),
  error: z.object({ code: z.enum(ERROR_CODES), message: z.string() }),
});
export type SocketAckError = z.infer<typeof socketAckErrorSchema>;

const ack = <T extends z.ZodType>(data: T) =>
  z.discriminatedUnion('ok', [z.object({ ok: z.literal(true), data }), socketAckErrorSchema]);

export const SESSION_REVOKE_REASONS = ['locked', 'password_changed', 'logout_all'] as const;
export type SessionRevokeReason = (typeof SESSION_REVOKE_REASONS)[number];

/** Client → Server (có ack) */
export const clientEvents = {
  'room.join': {
    payload: roomRef,
    ack: ack(z.object({ unread: z.number().int().min(0), online: z.number().int().min(0) })),
  },
  'room.leave': { payload: roomRef, ack: ack(z.object({})) },
  /** S-12: ack sau khi commit; idempotent theo clientMsgId */
  'message.send': {
    payload: z.intersection(sendMessageSchema, roomRef),
    ack: ack(chatMessageSchema),
  },
  'message.react': {
    payload: reactMessageSchema.extend(messageRef.shape),
    ack: ack(chatMessageSchema),
  },
  'message.pin': {
    payload: pinMessageSchema.extend(messageRef.shape),
    ack: ack(chatMessageSchema),
  },
} as const;

/** Server → Client */
export const serverEvents = {
  /** D-48: chatMessageSchema không có isSimulated */
  'message.new': chatMessageSchema,
  'message.updated': chatMessageSchema,
  /** S-01: chỉ phát số, gom tối đa mỗi 5 giây */
  'room.online': z.object({ roomId: z.string(), online: z.number().int().min(0) }),
  'member.request': z.object({ groupId: z.string(), userId: z.string(), intro: z.string() }),
  'notification.new': notificationSchema,
  'membership.updated': z.object({
    status: z.enum(MEMBERSHIP_FEE_STATUS),
    validUntil: z.string().nullable(),
  }),
  'session.revoked': z.object({ reason: z.enum(SESSION_REVOKE_REASONS) }),
} as const;

export type ClientEventName = keyof typeof clientEvents;
export type ServerEventName = keyof typeof serverEvents;
export type ClientPayload<E extends ClientEventName> = z.infer<(typeof clientEvents)[E]['payload']>;
export type ClientAck<E extends ClientEventName> = z.infer<(typeof clientEvents)[E]['ack']>;
export type ServerPayload<E extends ServerEventName> = z.infer<(typeof serverEvents)[E]>;

/** Tên room Socket.IO */
export const socketRooms = {
  user: (userId: string) => `user:${userId}`,
  room: (roomId: string) => `room:${roomId}`,
} as const;
