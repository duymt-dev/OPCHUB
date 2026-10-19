import type { MembershipFeeStatus } from '@opchub/shared';

/** Trạng thái phí đọc từ Redis `auth:fee` hoặc claim JWT (ISO string) / DB (Date) */
export interface FeeLike {
  status: MembershipFeeStatus;
  validUntil: string | Date | null;
}

const toMs = (v: string | Date): number => (v instanceof Date ? v.getTime() : Date.parse(v));

/**
 * D-57 / BUG-018: phí hết hạn NGAY khi `valid_until <= now`, không chờ job `fee-status-daily`.
 * Chỉ tính lại trạng thái đang "còn hiệu lực" (`active`, `expiring`); trạng thái khác giữ nguyên.
 * Thuần — không ghi DB (job vẫn là nơi đổi trạng thái + outbox).
 */
export function effectiveFeeStatus(fee: FeeLike, now: Date): MembershipFeeStatus {
  if (fee.status !== 'active' && fee.status !== 'expiring') return fee.status;
  if (fee.validUntil === null) return fee.status;
  const until = toMs(fee.validUntil);
  if (Number.isNaN(until)) return fee.status;
  return until <= now.getTime() ? 'expired' : fee.status;
}

/** Phí dùng được (paywall REST, chat, socket) theo trạng thái hiệu lực tại `now` */
export function isFeeUsable(fee: FeeLike | null | undefined, now: Date): boolean {
  if (!fee) return false;
  const s = effectiveFeeStatus(fee, now);
  return s === 'active' || s === 'expiring';
}
