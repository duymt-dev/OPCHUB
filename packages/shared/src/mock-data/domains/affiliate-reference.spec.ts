import { beforeEach, describe, expect, it } from 'vitest';
import { affiliateCommissionQuerySchema } from '../../api-domains';
import { resetMockDb } from './store';
import { seedMockAffiliateScenario } from './affiliate-demo';
import { affiliateMockState } from './affiliate';
import { mockAdminCommissions } from './affiliate-admin/read';
import { setMockAffiliateRates, saveMockAffiliatePolicy } from './affiliate-admin/write';
import { readMockAffiliatePolicy } from './affiliate-policy';
import {
  captureMockAffiliateSnapshot,
  restoreMockAffiliateSnapshot,
} from './affiliate-persistence/snapshot';
import { recordMockReference } from './affiliate-reference';
const rows = () => mockAdminCommissions(affiliateCommissionQuerySchema.parse({ size: 100 })).items;
beforeEach(() => {
  resetMockDb();
  seedMockAffiliateScenario();
});
describe('REQ-619 D-131 fake reference ledger mirrors native', () => {
  it('renewal snapshots persist and never reprice on rate/policy changes', () => {
    const before = rows(),
      renewals = before.filter((r) => r.customerYear > 1);
    expect(renewals.map((r) => r.customerYear).sort()).toEqual([2, 3]);
    const owner = renewals[0]!.affiliateId;
    expect(setMockAffiliateRates('admin', { ids: [owner], rate: 30 }).ok).toBe(true);
    expect(
      saveMockAffiliatePolicy('admin', {
        ...readMockAffiliatePolicy(),
        renewalRate: 15,
        renewalMaxYear: 4,
      }).ok,
    ).toBe(true);
    expect(rows().filter((r) => r.customerYear > 1)).toEqual(renewals);
    const snapshot = captureMockAffiliateSnapshot();
    resetMockDb();
    restoreMockAffiliateSnapshot(snapshot);
    expect(rows().filter((r) => r.customerYear > 1)).toEqual(renewals);
  });
  it('D-131 BR-463 never inserts a rounded-zero or self-referral row', () => {
    rows();
    const state = affiliateMockState(),
      ref = [...state.referrals.values()][0]!;
    const before = state.referenceCommissions.size;
    recordMockReference({
      source: 'membership',
      sourceId: 'zero-dong',
      customerId: ref.userId,
      baseAmount: 1,
      plan: 'personal',
      at: ref.row.date,
    });
    expect(state.referenceCommissions.size).toBe(before);
    ref.agentId = ref.userId;
    recordMockReference({
      source: 'membership',
      sourceId: 'self',
      customerId: ref.userId,
      baseAmount: 1200000,
      plan: 'personal',
      at: ref.row.date,
    });
    expect(state.referenceCommissions.size).toBe(before);
  });
});
