import type { AffiliatePolicy } from '../../api-domains';
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
  };
}
export function replaceMockAffiliatePolicy(policy: AffiliatePolicy): void {
  policies.set(mockDb(), { ...policy });
}
