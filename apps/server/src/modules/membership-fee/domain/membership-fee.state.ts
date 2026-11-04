import type { MembershipFeeStatus } from '@opchub/shared';
export { statusAfterRevoke } from '@opchub/shared';

/** §8 máy trạng thái phí thành viên (BR-03 → BR-05; BR-TRIAL-04: trial → active | expired) */
export const TRANSITIONS: Record<MembershipFeeStatus, readonly MembershipFeeStatus[]> = {
  trial: ['active', 'expired', 'regional_director'],
  // Dữ liệu cũ (D-116) — không tạo mới
  pending_payment: ['active', 'regional_director'],
  // active → active = gia hạn nối tiếp khi còn hiệu lực
  active: ['active', 'expiring', 'regional_director'],
  expiring: ['active', 'expired', 'regional_director'],
  expired: ['active', 'regional_director'],
  regional_director: [],
};

/** SPEC 6 / 10: restoring a fee is authorized only by explicit revocation. */
export const canTransition = (
  from: MembershipFeeStatus,
  to: MembershipFeeStatus,
  context?: 'revoke',
) =>
  from === 'regional_director' && context === 'revoke'
    ? (
        ['trial', 'active', 'expiring', 'pending_payment'] as readonly MembershipFeeStatus[]
      ).includes(to)
    : TRANSITIONS[from].includes(to);

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
