import type { MembershipFeeStatus } from '../../../enums';
import { DAY_MS } from '../util';

/** Mirrors native BR-462: restore the old clock, never grant a replacement trial. */
export function mockFeeAfterDirector(
  previous: { status: MembershipFeeStatus; validUntil: string | null },
  now: number,
): MembershipFeeStatus {
  const until = previous.validUntil ? Date.parse(previous.validUntil) : NaN;
  if (!Number.isFinite(until) || until <= now) return 'pending_payment';
  if (previous.status === 'trial') return 'trial';
  if (
    previous.status === 'pending_payment' ||
    previous.status === 'expired' ||
    previous.status === 'regional_director'
  )
    return 'pending_payment';
  return until - now <= 30 * DAY_MS ? 'expiring' : 'active';
}
