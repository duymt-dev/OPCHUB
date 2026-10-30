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

beforeEach(() => resetMockDb());
describe('REQ-617 D-122 demo epoch provenance', () => {
  it.each([{}, { paused: true }, { payout: true }])(
    'backfills optional AF0 after early state initialization: %j',
    (options) => {
      mockRevenueState();
      seedMockAffiliateScenario(options);
      expect(new Map(mockRevenueState().first)).toEqual(
        new Map(
          mockDb()
            .fees.filter((f) => f.paidAt && f.amount > 0)
            .map((f) => [f.userId, f.paidAt]),
        ),
      );
      expect(mockRevenueState().shares).toEqual([]);
      expect(mockRevenueState().pending).toEqual([]);
      expect(mockRevenueState().payouts).toEqual([]);
      const snapshot = captureMockAffiliateSnapshot();
      seedMockAffiliateScenario(options);
      expect(captureMockAffiliateSnapshot()).toEqual(snapshot);
      resetMockDb();
      restoreMockAffiliateSnapshot(JSON.parse(JSON.stringify(snapshot)));
      expect(captureMockAffiliateSnapshot().revenue).toEqual(snapshot.revenue);
    },
  );
  it('does not overwrite an earlier real receipt with a newer demo paidAt', () => {
    captureMockRevenue(receipt('af-customer-c1', { receivedAt: '2020-01-01T00:00:00.000Z' }));
    seedMockAffiliateScenario();
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
