import { revenueAmounts, sharingRate } from '@opchub/shared';
import { revenueSharingPolicySchema, type RevenueSharingPolicy } from '@opchub/shared/api-domains';
import type { PolicyYear } from './types';

export function previewPolicy(values: unknown): RevenueSharingPolicy | null {
  const parsed = revenueSharingPolicySchema.strip().safeParse(values);
  return parsed.success ? parsed.data : null;
}

/** Bounded by integer percentages: at most101 rows, including a zero floor. */
export function policyYears(policy: RevenueSharingPolicy): PolicyYear[] {
  const { yearOneRate, annualDecrease, minimumRate } = policy;
  const last =
    annualDecrease === 0 ? 1 : Math.ceil((yearOneRate - minimumRate) / annualDecrease) + 1;
  return Array.from({ length: last }, (_, index) => {
    const year = index + 1;
    const rate = sharingRate(year, policy);
    return { year, rate, mediaSoft: 100 - rate, ongoing: year === last };
  });
}

export function policyPlanAmounts(amount: number, rate: number) {
  // A free configured plan is a zero preview, never an actual receipt/entitlement.
  return amount === 0 ? { directorAmount: 0, mediaSoftAmount: 0 } : revenueAmounts(amount, rate);
}
