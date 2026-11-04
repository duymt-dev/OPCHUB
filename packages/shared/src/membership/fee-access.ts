import type { MembershipFeeStatus } from '../enums';

/** Trạng thái phí đọc từ Redis `auth:fee` hoặc claim JWT (ISO string) / DB (Date) */
export interface FeeLike {
  status: MembershipFeeStatus;
  validUntil: string | Date | null;
}

/** BR-TRIAL-01 (D-94 1A): miễn phí 90 ngày kể từ ngày đăng ký */
export const TRIAL_DAYS = 90;

/**
 * V-11, BR-TRIAL-05: tập trạng thái "đã kích hoạt" duy nhất — server (guard, socket, upload),
 * SQL lọc (Khám phá, onboarding, Admin, thống kê) và FE đều dùng hằng này, không tự liệt kê.
 */
export const USABLE_FEE_STATUS = [
  'trial',
  'active',
  'expiring',
  'regional_director',
] as const satisfies readonly MembershipFeeStatus[];
/** D-120: exemption ends only on revocation. */
export const OPEN_ENDED_FEE_STATUS = [
  'regional_director',
] as const satisfies readonly MembershipFeeStatus[];
/** Phí thật đã thu (không gồm trial) — thẻ "Phí", lọc "Đã đóng phí" (D-107) */
export const PAID_FEE_STATUS = [
  'active',
  'expiring',
] as const satisfies readonly MembershipFeeStatus[];

const has = (list: readonly MembershipFeeStatus[], s: MembershipFeeStatus) => list.includes(s);
const toMs = (v: string | Date): number => (v instanceof Date ? v.getTime() : Date.parse(v));

/**
 * D-57 / BUG-018: phí hết hạn NGAY khi `valid_until <= now`, không chờ job `fee-status-daily`.
 * Chỉ tính lại trạng thái đang "còn hiệu lực" (trial, active, expiring); trạng thái khác giữ nguyên.
 * Thuần — không ghi DB (job vẫn là nơi đổi trạng thái + outbox).
 */
export function effectiveFeeStatus(fee: FeeLike, now: Date): MembershipFeeStatus {
  if (has(OPEN_ENDED_FEE_STATUS, fee.status)) return fee.status;
  if (!has(USABLE_FEE_STATUS, fee.status)) return fee.status;
  if (fee.validUntil === null) return fee.status;
  const until = toMs(fee.validUntil);
  if (Number.isNaN(until)) return fee.status;
  return until <= now.getTime() ? 'expired' : fee.status;
}

/** Phí dùng được (paywall REST, chat, socket, upload, FE) theo trạng thái hiệu lực tại `now` */
export function isFeeUsable(fee: FeeLike | null | undefined, now: Date): boolean {
  if (!fee) return false;
  return has(USABLE_FEE_STATUS, effectiveFeeStatus(fee, now));
}

/** Phí thật còn hiệu lực (không tính trial) */
export function isFeePaid(fee: FeeLike | null | undefined, now: Date): boolean {
  if (!fee) return false;
  return has(PAID_FEE_STATUS, effectiveFeeStatus(fee, now));
}

/** SQL `IN (...)` dùng cùng tập (Prisma.join / mảng) — không viết tay danh sách trạng thái */
export const usableFeeStatuses = (): MembershipFeeStatus[] => [...USABLE_FEE_STATUS];
