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
  /** TIP-501/502: durable publication after the same commit as cursor and persona messages. */
  'bot.turn_posted': z.object({ messageId: z.string().min(1) }),
  'membership_fee.activated': feeState,
  'membership_fee.changed': feeState,
  /** §20 AF-R01/R05: mọi đường xác nhận phí (webhook, ghi nhận, khớp tay) — cùng tx với kỳ phí */
  'membership_fee.confirmed': z.object({
    userId: z.string(),
    periodId: z.string(),
    listAmount: z.number().int(),
    confirmedAt: z.string(),
    isFirst: z.boolean(),
  }),
  /** AF-R06: hoa hồng mới → thông báo đại lý */
  'affiliate.commission_recorded': z.object({ commissionId: z.string() }),
  'affiliate.commission_cancelled': z.object({
    commissionIds: z.array(z.string()).min(1).max(100),
    reason: z.string().min(1).max(500),
    notificationId: z.string().uuid(),
  }),
  'affiliate.rate_changed': z.object({
    affiliateIds: z.array(z.string()).min(1).max(100),
    rate: z.number().int().min(1).max(50),
    notificationId: z.string().uuid(),
  }),
  'affiliate.payout_recorded': z.object({
    affiliateId: z.string(),
    monthKey: z.string(),
    payoutId: z.string(),
  }),
  /** Nhắc phí (NA-04, D-57): mốc tự động hoặc `manual` khi Admin nhắc tay → thông báo chuông */
  'membership_fee.reminded': z.object({
    items: z.array(z.object({ userId: z.string(), text: z.string() })).max(500),
  }),
  'user.locked': z.object({ userId: z.string(), reason: z.string().nullable() }),
  'user.session_revoked': z.object({
    userId: z.string(),
    reason: z.enum(SESSION_REVOKE_REASONS),
  }),
  /** Mở khoá (NA-16, D-55): dự án tự hiện lại, nhóm không trả lại — consumer để TIP sau mở rộng */
  'user.unlocked': z.object({ userId: z.string() }),
  /** `priority` NA-05 (1 OTP … 5 chiến dịch) → priority BullMQ; sự kiện cũ không có → 3 */
  'mail.requested': z.object({ mailLogId: z.string(), priority: z.number().int().optional() }),
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
  /** NA-12: gán hàng loạt — chỉ cặp (thành viên, nhóm) MỚI → 1 thông báo / nhóm mới */
  'group.members_assigned': z.object({
    pairs: z.array(z.object({ userId: z.string(), groupId: z.string() })).max(10_000),
  }),
  /** NA-29: chủ nhóm mới (tạo nhóm / đổi chủ) → thông báo "Bạn là chủ nhóm …" */
  'group.owner_changed': z.object({ groupId: z.string(), userId: z.string() }),
  /** NA-09: Admin thêm chủ đề → `room.created` tới các phòng socket của nhóm */
  'group.topic_created': z.object({ groupId: z.string(), roomIds: z.array(z.string()).max(50) }),
  /** Đăng ký sự kiện (B31) → thông báo cá nhân + mail xác nhận */
  'event.registered': z.object({ eventId: z.string(), userId: z.string() }),
  /** NA-23: scheduler 15' — nhắc 24h trước giờ bắt đầu (mỗi sự kiện một lần, `reminded_at`) */
  'event.reminder_due': z.object({ eventId: z.string() }),
  /** Chiến dịch chuyển sang `sending` (B42) → worker gửi theo lô */
  'campaign.send': z.object({ campaignId: z.string() }),
  /** Admin xuất dữ liệu (B43) → worker `export.run` */
  'export.requested': z.object({ exportJobId: z.string() }),
  /** Bình luận phiếu YC @nhắc nhân sự (B46) → thông báo cá nhân */
  'service_request.mentioned': z.object({
    code: z.string(),
    commentId: z.string(),
    userIds: z.array(z.string()).max(10),
    by: z.string(),
  }),
  /** IV-R01: mỗi tin Admin gửi nhà đầu tư → thông báo in-app `invest` (TIP-V2-107) */
  'investor.admin_replied': z.object({ investorKey: z.string(), commentId: z.string() }),
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
