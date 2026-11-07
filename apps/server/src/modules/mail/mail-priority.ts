import type { MailKind } from '@opchub/db';

/**
 * NA-05: thứ tự gửi theo loại thư (số nhỏ chạy trước — `priority` BullMQ + `mail_logs.priority`).
 * OTP / đặt lại mật khẩu = 1 (được dùng cả phần hạn mức dành riêng); thư giao dịch = 3; thử = 4;
 * chiến dịch = 5 (vượt hạn mức → dời 08:00 giờ VN ngày sau).
 */
export const MAIL_PRIORITY: Record<MailKind, number> = {
  otp: 1,
  password_reset: 1,
  welcome: 3,
  fee_reminder: 3,
  event: 3,
  service: 3,
  fundraising: 3,
  onboarding: 3,
  receipt: 3,
  regional_director: 3,
  regional_director_appoint: 3,
  regional_director_revoke: 3,
  test: 4,
  campaign: 5,
};

export const URGENT_PRIORITY = 1;
export const CAMPAIGN_PRIORITY = MAIL_PRIORITY.campaign;
/** Sự kiện outbox cũ (trước TIP-V2-114) không mang priority */
export const DEFAULT_PRIORITY = 3;

export const priorityOf = (kind: MailKind): number => MAIL_PRIORITY[kind];
