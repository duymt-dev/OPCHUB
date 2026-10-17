import { z } from 'zod';
import { MEMBERSHIP_FEE_STATUS } from '../enums';
import { SESSION_REVOKE_REASONS } from '../socket/events';

/**
 * Sự kiện outbox (ADR-0005): ghi cùng transaction với thay đổi nghiệp vụ, relay worker xử lý.
 * TIP domain chỉ THÊM dòng. Consumer phải idempotent.
 */
const feeState = z.object({
  userId: z.string(),
  status: z.enum(MEMBERSHIP_FEE_STATUS),
  validUntil: z.string().nullable(),
});

export const outboxEvents = {
  'membership_fee.activated': feeState,
  'membership_fee.changed': feeState,
  'user.locked': z.object({ userId: z.string(), reason: z.string().nullable() }),
  'user.session_revoked': z.object({
    userId: z.string(),
    reason: z.enum(SESSION_REVOKE_REASONS),
  }),
  'user.role_changed': z.object({ userId: z.string(), systemRole: z.string() }),
  'mail.requested': z.object({ mailLogId: z.string() }),
  'group.join_requested': z.object({
    groupId: z.string(),
    userId: z.string(),
    intro: z.string(),
  }),
  /** S-04: chỉ người được @nhắc / người bị trả lời — không cả phòng */
  'chat.mentioned': z.object({
    messageId: z.string(),
    roomId: z.string(),
    senderId: z.string(),
    userIds: z.array(z.string()).max(21),
    kind: z.enum(['mention', 'reply']),
  }),
  /** Kiểm duyệt cảnh báo người gửi (B24) → thông báo cá nhân (B25) */
  'moderation.warned': z.object({ userId: z.string(), messageId: z.string(), roomId: z.string() }),
  'group.request_decided': z.object({
    groupId: z.string(),
    userId: z.string(),
    decision: z.enum(['approve', 'reject']),
  }),
  /** Đăng ký sự kiện (B31) → thông báo cá nhân + mail xác nhận */
  'event.registered': z.object({ eventId: z.string(), userId: z.string() }),
  /** Chiến dịch chuyển sang `sending` (B42) → worker gửi theo lô */
  'campaign.send': z.object({ campaignId: z.string() }),
} as const;

export type OutboxEventType = keyof typeof outboxEvents;
export type OutboxPayload<T extends OutboxEventType> = z.infer<(typeof outboxEvents)[T]>;

export const isOutboxEventType = (t: string): t is OutboxEventType => t in outboxEvents;

export function parseOutboxPayload<T extends OutboxEventType>(
  type: T,
  payload: unknown,
): OutboxPayload<T> {
  return outboxEvents[type].parse(payload) as OutboxPayload<T>;
}
