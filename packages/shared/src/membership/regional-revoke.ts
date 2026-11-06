import type { MembershipFeeStatus } from '../enums';

/** D-120 / BR-462: restore the original deadline; never extend it on revocation. */
export function statusAfterRevoke(
  prevStatus: MembershipFeeStatus | null,
  prevValidUntil: Date | null,
  now: Date,
): MembershipFeeStatus {
  if (!prevValidUntil || prevValidUntil.getTime() <= now.getTime()) return 'pending_payment';
  if (prevStatus === 'trial') return 'trial';
  return prevValidUntil.getTime() - now.getTime() <= 30 * 86_400_000 ? 'expiring' : 'active';
}
