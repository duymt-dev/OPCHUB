import { z } from 'zod';
import { MEMBERSHIP_FEE_STATUS } from '../enums';
import {
  chatMessageSchema,
  pinMessageSchema,
  reactMessageSchema,
  sendMessageSchema,
} from '../api-domains/chat-room';
import { notificationSchema } from '../api-domains/settings';
import { liveMetricsSchema, METRICS_SCOPES } from '../api-domains/dashboard';
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
  /** NA-24: đang xem Dashboard/Tổng quan và tab hiện → nhận `metrics.updated` mỗi 3 giây */
  'metrics.subscribe': {
    payload: z.object({ scope: z.enum(METRICS_SCOPES) }),
    ack: ack(liveMetricsSchema),
  },
  'metrics.unsubscribe': {
    payload: z.object({ scope: z.enum(METRICS_SCOPES) }),
    ack: ack(z.object({})),
  },
  /** NA-25: theo dõi số đỏ các nhóm đã tham gia (vào room `group:{id}`, kiểm thành viên 1 query) */
  'groups.watch': {
    payload: z.object({ groupIds: z.array(z.string().min(1)).max(100) }),
    ack: ack(z.object({ groupIds: z.array(z.string()) })),
  },
} as const;

/** Server → Client */
export const serverEvents = {
  /** D-48: chatMessageSchema không có isSimulated */
  'message.new': chatMessageSchema,
  'message.updated': chatMessageSchema,
  /** S-01: chỉ phát số, gom tối đa mỗi 5 giây */
  'room.online': z.object({ roomId: z.string(), online: z.number().int().min(0) }),
  /** NA-09: Admin thêm chủ đề — client tải lại danh sách chủ đề của nhóm */
  'room.created': z.object({ groupId: z.string(), roomId: z.string() }),
  /** Visibility changed in bulk: refetch room messages, pins and files. */
  'room.reload': z.object({ roomId: z.string().min(1) }),
  'notification.new': notificationSchema,
  'membership.updated': z.object({
    status: z.enum(MEMBERSHIP_FEE_STATUS),
    validUntil: z.string().nullable(),
  }),
  'session.revoked': z.object({ reason: z.enum(SESSION_REVOKE_REASONS) }),
  /** NA-24: bộ đếm Redis đẩy mỗi 3 giây vào room `metrics:{scope}` (không query DB mỗi nhịp) */
  'metrics.updated': liveMetricsSchema,
  /** NA-25: một emit vào room `group:{id}` cho mỗi tin; client tự +1 nếu không phải tin của mình */
  'unread.bump': z.object({
    roomId: z.string(),
    groupId: z.string(),
    senderId: z.string().nullable(),
  }),
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
  group: (groupId: string) => `group:${groupId}`,
  metrics: (scope: string) => `metrics:${scope}`,
} as const;
