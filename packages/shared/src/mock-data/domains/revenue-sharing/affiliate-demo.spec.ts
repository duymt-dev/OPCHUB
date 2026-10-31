import { beforeEach, describe, expect, it } from 'vitest';
import {
  affiliateRevenueCustomers,
  buildAffiliateRevenueDemo,
} from '../../../fixtures/revenue-affiliate-demo';
import { seedMockAffiliateScenario } from '../affiliate-demo';
import {
  captureMockAffiliateSnapshot,
  restoreMockAffiliateSnapshot,
} from '../affiliate-persistence/snapshot';
import { captureMockDirectorSnapshot } from '../regional-directors/state';
import { resetMockDb, mockDb } from '../store';
import { seedMockAffiliateRevenueDemo } from './affiliate-demo';
import { captureMockRevenue } from './capture';
import { mockRevenueDashboard } from './dashboard';
import { mockRevenueLedger } from './read';
import { mockRevenueState } from './state';
import { receipt } from './revenue.fixture';

beforeEach(() => resetMockDb());
describe('REQ-617 D-119 regenerated AF0 MSW sharing history', () => {
  it('exposes reference totals and real paginated customer names from the common recipe', () => {
    seedMockAffiliateScenario();
    seedMockAffiliateRevenueDemo();
    const dashboard = mockRevenueDashboard();
    expect(dashboard.stats).toMatchObject({
      receiptCount: '50',
      affiliateCount: '6',
      received: '100800000',
      allocated: '44880000',
      paid: '28680000',
      due: '16200000',
      mediaSoft: '55920000',
    });
    expect(dashboard.items.map((r) => [r.region, r.stats.receiptCount, r.stats.allocated])).toEqual(
      [
        ['north', '49', '44400000'],
        ['central', '1', '480000'],
        ['south', '0', '0'],
      ],
    );
    const ledger = mockRevenueLedger('m3', { size: 8 });
    expect(ledger.ok).toBe(true);
    if (!ledger.ok) throw new Error('Missing ledger');
    expect(ledger.data.items).toHaveLength(8);
    expect(ledger.data.items[0]).toMatchObject({
      customerName: 'Đỗ Minh Tuấn',
      customerYear: 2,
      directorAmount: 1440000,
    });
    expect(ledger.data.nextCursor).not.toBeNull();
    expect(mockRevenueState().shares).toEqual(buildAffiliateRevenueDemo().shares);
  });
  it('persists dates, provinces and immutable payouts without reseeding them on reload', () => {
    seedMockAffiliateScenario();
    seedMockAffiliateRevenueDemo();
    const snapshot = captureMockAffiliateSnapshot();
    const first = new Map(snapshot.revenue!.first);
    for (const c of affiliateRevenueCustomers) expect(first.get(c.userId)).toBe(c.firstReceivedAt);
    expect(captureMockDirectorSnapshot().history).toHaveLength(1);
    for (const owner of ['m1', 'af-owner-a2', 'af-owner-a3', 'af-owner-a4', 'af-owner-a5']) {
      const id = [...mockDb().groupMembers.get(owner)!.keys()][0];
      expect(mockDb().groups.find((g) => g.id === id)?.province).toBe('Hà Nội');
    }
    seedMockAffiliateRevenueDemo();
    expect(captureMockAffiliateSnapshot()).toEqual(snapshot);
    resetMockDb();
    restoreMockAffiliateSnapshot(JSON.parse(JSON.stringify(snapshot)));
    seedMockAffiliateRevenueDemo();
    expect(captureMockAffiliateSnapshot()).toEqual(snapshot);
  });
  it('rejects destructive reseeding after a captured receipt, preserving the outbox', () => {
    seedMockAffiliateScenario({ payout: true });
    captureMockRevenue(receipt('af-customer-c1'));
    const before = captureMockAffiliateSnapshot();
    expect(() => seedMockAffiliateRevenueDemo()).toThrow('before recording revenue');
    expect(captureMockAffiliateSnapshot()).toEqual(before);
  });
});
