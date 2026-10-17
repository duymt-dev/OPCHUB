import type { MembershipFeeStatus } from '@opchub/shared';

/** §8 máy trạng thái phí thành viên (BR-03 → BR-05) */
export const TRANSITIONS: Record<MembershipFeeStatus, readonly MembershipFeeStatus[]> = {
  pending_payment: ['active'],
  // active → active = gia hạn nối tiếp khi còn hiệu lực
  active: ['active', 'expiring'],
  expiring: ['active', 'expired'],
  expired: ['active'],
};

export const canTransition = (from: MembershipFeeStatus, to: MembershipFeeStatus) =>
  TRANSITIONS[from].includes(to);

/** Còn ≤ 30 ngày → `expiring` (admin.ts EXPIRING_MS) */
export const EXPIRING_DAYS = 30;
const DAY_MS = 86_400_000;

/** Trạng thái theo hạn: chưa có hạn → chờ thanh toán */
export function statusByValidUntil(validUntil: Date | null, now: Date): MembershipFeeStatus {
  if (!validUntil) return 'pending_payment';
  const left = validUntil.getTime() - now.getTime();
  if (left <= 0) return 'expired';
  return left <= EXPIRING_DAYS * DAY_MS ? 'expiring' : 'active';
}
