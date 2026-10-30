import { beforeEach, describe, expect, it } from 'vitest';
import { REVENUE_DEMO } from '../../../fixtures/revenue-demo';
import {
  captureMockAffiliateSnapshot,
  restoreMockAffiliateSnapshot,
} from '../affiliate-persistence/snapshot';
import {
  captureCommunitySnapshot,
  restoreCommunitySnapshot,
} from '../community-persistence/snapshot';
import { revokeMockDirector } from '../regional-directors/write';
import { mockDirectorState } from '../regional-directors/state';
import { mockDb, resetMockDb } from '../store';
import { seedMockRevenueScenario } from './scenario';
import { mockRevenueState } from './state';
import { payMockDirectorRevenue } from './payout';
import { mockRevenueBalance } from './read';

beforeEach(() => resetMockDb());
describe('REQ-617 common functional revenue scenario', () => {
  it('is opt-in and captures exact years/rates, odd-dong rounding and direct-registration remainder', () => {
    expect(mockRevenueState().shares).toEqual([]);
    seedMockRevenueScenario();
    const shares = mockRevenueState().shares;
    expect(
      shares.map((r) => [r.customerYear, r.directorRate, r.directorAmount, r.mediaSoftAmount]),
    ).toEqual([
      [1, 50, 600001, 600000],
      [2, 40, 480000, 720000],
      [3, 30, 360000, 840000],
      [4, 20, 240000, 960000],
      [1, 0, 0, 3600000],
    ]);
    expect(mockRevenueBalance('m3')).toMatchObject({
      ok: true,
      data: { due: '1680001', receiptCount: '4' },
    });
    expect(mockDb().fees).toHaveLength(16);
    expect(mockDirectorState().history).toHaveLength(1);
    expect(mockDirectorState().config.slots[0]?.incumbent?.appointedAt).toBe(
      REVENUE_DEMO.appointedAt,
    );
  });
  it('payout/revocation/reload never reseeds money, bank or appointment history', () => {
    seedMockRevenueScenario();
    const now = Date.parse('2026-10-18T03:00:00Z');
    expect(revokeMockDirector('admin', 'north', { version: 1 }, now).ok).toBe(true);
    const result = payMockDirectorRevenue('admin', 'm3', REVENUE_DEMO.month, 'demo-payout', now);
    expect(result).toMatchObject({ ok: true, data: { amount: '1680001', shareCount: 4 } });
    const state = captureMockAffiliateSnapshot();
    const community = captureCommunitySnapshot();
    resetMockDb();
    restoreMockAffiliateSnapshot(JSON.parse(JSON.stringify(state)));
    restoreCommunitySnapshot(JSON.parse(JSON.stringify(community)));
    seedMockRevenueScenario();
    expect(captureMockAffiliateSnapshot()).toEqual(state);
    expect(
      mockDirectorState().config.slots.find((r) => r.region === 'north')?.incumbent,
    ).toBeNull();
    expect(payMockDirectorRevenue('admin', 'm3', REVENUE_DEMO.month, 'demo-payout', now)).toEqual(
      result,
    );
    expect(mockRevenueBalance('m3')).toMatchObject({
      ok: true,
      data: { due: '0', paid: '1680001' },
    });
    expect(mockDb().groupMembers.get(REVENUE_DEMO.agentId)?.size).toBe(1);
  });
  it('reset removes optional people/history without touching the default director fixture', () => {
    seedMockRevenueScenario();
    resetMockDb();
    expect(mockDb().fees).toHaveLength(10);
    expect(mockRevenueState().shares).toEqual([]);
    expect(mockDirectorState().history).toEqual([]);
  });
});
