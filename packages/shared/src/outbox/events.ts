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
  'group.request_decided': z.object({
    groupId: z.string(),
    userId: z.string(),
    decision: z.enum(['approve', 'reject']),
  }),
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
