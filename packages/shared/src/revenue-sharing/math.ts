import {
  revenueSharingPolicySchema,
  type RevenueSharingPolicy,
  type RevenueShareStatus,
} from '../api-domains';

const VN_OFFSET = 7 * 3_600_000;

/** D-122: calendar anniversaries of the first receipt, not registration or 365-day blocks. */
export function customerYear(firstReceivedAt: Date, receivedAt: Date): number {
  const firstTime = firstReceivedAt.getTime();
  const receivedTime = receivedAt.getTime();
  if (!Number.isFinite(firstTime) || !Number.isFinite(receivedTime) || receivedTime < firstTime) {
    throw new RangeError('Receipt dates must be valid and chronologically ordered');
  }
  const first = new Date(firstTime + VN_OFFSET);
  const received = new Date(receivedTime + VN_OFFSET);
  const years = received.getUTCFullYear() - first.getUTCFullYear();
  const anniversary = new Date(first);
  // Clamp February 29 to the last day of February, matching membership's 12-month rule.
  anniversary.setUTCDate(1);
  anniversary.setUTCFullYear(first.getUTCFullYear() + years);
  const lastDay = new Date(anniversary);
  lastDay.setUTCMonth(lastDay.getUTCMonth() + 1, 0);
  anniversary.setUTCDate(Math.min(first.getUTCDate(), lastDay.getUTCDate()));
  return years + (received >= anniversary ? 1 : 0);
}

export function sharingRate(year: number, policy: RevenueSharingPolicy): number {
  if (!Number.isSafeInteger(year) || year < 1)
    throw new RangeError('Customer year must be positive');
  const p = revenueSharingPolicySchema.parse(policy);
  return Math.max(p.minimumRate, p.yearOneRate - p.annualDecrease * (year - 1));
}

/** D-119/D-110: nearest dong; exact remainder ensures the allocation conserves revenue. */
export function revenueAmounts(amount: number, directorRate: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new RangeError('Only positive actual receipts can be shared');
  }
  if (!Number.isInteger(directorRate) || directorRate < 0 || directorRate > 100) {
    throw new RangeError('Director rate must be an integer percentage');
  }
  const directorAmount = Number((BigInt(amount) * BigInt(directorRate) + 50n) / 100n);
  return { directorAmount, mediaSoftAmount: amount - directorAmount };
}

/** D-121: vacancy/no referral is represented explicitly, never substituted with a default director. */
export function allocateRevenue(input: {
  amount: number;
  firstReceivedAt: Date;
  receivedAt: Date;
  policy: RevenueSharingPolicy;
  hasDirector: boolean;
}) {
  const year = customerYear(input.firstReceivedAt, input.receivedAt);
  const configuredRate = sharingRate(year, input.policy);
  const directorRate = input.hasDirector ? configuredRate : 0;
  return { customerYear: year, directorRate, ...revenueAmounts(input.amount, directorRate) };
}

/** Payout is the only permitted transition; paid snapshots cannot be reopened or rewritten. */
export function canSettleRevenueShare(from: RevenueShareStatus, to: RevenueShareStatus): boolean {
  return from === 'recorded' && to === 'paid';
}
