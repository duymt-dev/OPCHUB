import { beforeEach, describe, expect, it } from 'vitest';
import { seedMockAffiliateScenario } from '../affiliate-demo';
import {
  captureMockAffiliateSnapshot,
  restoreMockAffiliateSnapshot,
} from '../affiliate-persistence/snapshot';
import { mockDb, resetMockDb } from '../store';
import { captureMockRevenue } from './capture';
import { seedMockRevenueEpochs } from './demo';
import { mockRevenueState } from './state';
import { receipt } from './revenue.fixture';
import {
  affiliateRevenueCustomers,
  affiliateRevenueOwners,
} from '../../../fixtures/revenue-affiliate-demo';

beforeEach(() => resetMockDb());
describe('REQ-617 D-122 demo epoch provenance', () => {
  it.each([{}, { paused: true }, { payout: true }])(
    'backfills optional AF0 after early state initialization: %j',
    (options) => {
      mockRevenueState();
      seedMockAffiliateScenario(options);
      const expected = new Map(
        mockDb()
          .fees.filter((f) => f.paidAt && f.amount > 0)
          .map((f) => [f.userId, f.paidAt]),
      );
      const regenerated = !('paused' in options) && !('payout' in options);
      if (regenerated)
        for (const p of [...affiliateRevenueCustomers, ...affiliateRevenueOwners]) {
          const previous = expected.get(p.userId);
          expected.set(
            p.userId,
            previous && previous < p.firstReceivedAt ? previous : p.firstReceivedAt,
          );
        }
      expect(new Map(mockRevenueState().first)).toEqual(expected);
      expect(mockRevenueState().shares).toHaveLength(regenerated ? 51 : 0);
      expect(mockRevenueState().pending).toEqual([]);
      expect(mockRevenueState().payouts).toHaveLength(regenerated ? 2 : 0);
      const snapshot = captureMockAffiliateSnapshot();
      seedMockAffiliateScenario(options);
      expect(captureMockAffiliateSnapshot()).toEqual(snapshot);
      resetMockDb();
      restoreMockAffiliateSnapshot(JSON.parse(JSON.stringify(snapshot)));
      expect(captureMockAffiliateSnapshot().revenue).toEqual(snapshot.revenue);
    },
  );
  it('rejects default regeneration after a real receipt without overwriting its earlier epoch', () => {
    captureMockRevenue(receipt('af-customer-c1', { receivedAt: '2020-01-01T00:00:00.000Z' }));
    const before = captureMockAffiliateSnapshot();
    expect(() => seedMockAffiliateScenario()).toThrow('before recording revenue');
    expect(captureMockAffiliateSnapshot()).toEqual(before);
    expect(new Map(mockRevenueState().first).get('af-customer-c1')).toBe(
      '2020-01-01T00:00:00.000Z',
    );
  });
  it('rejects seed reanchoring after financial activity without partially changing epochs', () => {
    captureMockRevenue(receipt('m1'));
    const fee = mockDb().fees.find((row) => row.userId === 'm1');
    if (!fee) throw new Error('Missing demo member');
    fee.paidAt = '2020-01-01T00:00:00.000Z';
    const before = structuredClone(mockRevenueState());
    expect(() => seedMockRevenueEpochs()).toThrow('before recording revenue');
    expect(mockRevenueState()).toEqual(before);
  });
});
