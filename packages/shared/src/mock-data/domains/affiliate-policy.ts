import type { AffiliatePolicy } from '../../api-domains';
import { revenueSharingPolicySchema } from '../../api-domains/revenue-sharing';
import { mockRevenueState } from './revenue-sharing/state';
import { mockDb, type MockDb } from './store';

const policies = new WeakMap<MockDb, AffiliatePolicy>();
export function readMockAffiliatePolicy(): AffiliatePolicy {
  return {
    ...(policies.get(mockDb()) ?? {
      defaultRate: 20,
      cookieDays: 30,
      fundraisingRate: 10,
      terms: '',
    }),
    ...mockRevenueState().policy,
  };
}
export function replaceMockAffiliatePolicy(policy: AffiliatePolicy): void {
  const { yearOneRate, annualDecrease, minimumRate } = policy;
  const sharing = revenueSharingPolicySchema.parse({
    yearOneRate,
    annualDecrease,
    minimumRate,
  });
  policies.set(mockDb(), { ...policy });
  mockRevenueState().policy = sharing;
}
