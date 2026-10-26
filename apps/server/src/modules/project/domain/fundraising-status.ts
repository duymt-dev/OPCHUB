import type { FundraisingStatus } from '@opchub/db';

/**
 * V4-610 (UP-11, AD-06, D-82): máy trạng thái Gói Gọi vốn. Mọi chuyển trạng thái đi qua đây và
 * cập nhật có điều kiện `WHERE status = from` (luật 7).
 */
export const FUNDRAISING_TRANSITIONS = {
  /** Đối soát đủ tiền */
  pay: { from: 'pending_payment', to: 'pending_review' },
  /** Admin duyệt → hiển thị 6 tháng */
  approve: { from: 'pending_review', to: 'active' },
  reject: { from: 'pending_review', to: 'rejected' },
  /** Job hằng ngày */
  expire: { from: 'active', to: 'expired' },
} as const satisfies Record<string, { from: FundraisingStatus; to: FundraisingStatus }>;
export type FundraisingStep = keyof typeof FUNDRAISING_TRANSITIONS;

/** Khoản đang mở (UQ partial `project_fundraisings_open`) */
export const FUNDRAISING_OPEN: readonly FundraisingStatus[] = ['pending_payment', 'pending_review'];

/** D-82: nhắc gia hạn trước 14 ngày */
export const RENEW_REMIND_DAYS = 14;
const DAY_MS = 86_400_000;

/** Ngày bắt đầu: nối tiếp khoản đang hiệu lực (gia hạn sớm), không thì từ lúc duyệt */
export function activeWindow(
  now: Date,
  months: number,
  currentEnd: Date | null,
): { startsAt: Date; endsAt: Date } {
  const startsAt = currentEnd && currentEnd > now ? currentEnd : now;
  const endsAt = new Date(startsAt);
  endsAt.setUTCMonth(endsAt.getUTCMonth() + months);
  return { startsAt, endsAt };
}

/** Còn > 14 ngày → chưa cho mua gia hạn (tránh mua chồng khi vừa duyệt) */
export const canRenew = (endsAt: Date, now: Date) =>
  endsAt.getTime() - now.getTime() <= RENEW_REMIND_DAYS * DAY_MS;

export const remindFrom = (now: Date) => new Date(now.getTime() + RENEW_REMIND_DAYS * DAY_MS);
