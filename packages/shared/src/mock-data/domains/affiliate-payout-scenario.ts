import { AFFILIATE_PAYOUT_SCENARIO as scenario } from '../../fixtures/affiliate-payout';
import { affiliateMockState } from './affiliate';
import { mockDb } from './store';

/** Same historical first-fee and missing live bank as the native opt-in fixture. */
export function seedMockAffiliatePayoutScenario(): void {
  const state = affiliateMockState();
  const fee = mockDb().fees.find((row) => row.userId === scenario.customerId);
  const ref = state.referrals.get(scenario.customerId);
  const owner = state.agents.get(scenario.ownerId);
  if (!fee || !ref || !owner) throw new Error('Missing Affiliate payout scenario precondition');
  fee.joinedAt = scenario.paidAt;
  fee.paidAt = scenario.paidAt;
  fee.validUntil = scenario.validUntil;
  ref.row.date = scenario.paidAt;
  ref.month = scenario.month;
  state.knownFees.set(scenario.customerId, scenario.paidAt);
  owner.bank = null;
}
