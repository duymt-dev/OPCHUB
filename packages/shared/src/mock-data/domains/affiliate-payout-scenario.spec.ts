import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AFFILIATE_PAYOUT_SCENARIO as scenario } from '../../fixtures';
import { affiliateMockState, mockAffiliateBank, myMockAffiliate } from './affiliate';
import { seedMockAffiliateScenario } from './affiliate-demo';
import { seedHistoricalMockPayment as payMockAffiliateMonth } from './affiliate-persistence/historical-payment.fixture';
import { mockDb, resetMockDb } from './store';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-20T03:00:00Z'));
  resetMockDb();
});
afterEach(() => vi.useRealTimers());
describe('Opt-in ended-month payout precondition, shared with native seed', () => {
  it('does not alter the ordinary AF0 dataset or base eight users', () => {
    expect(mockDb().fees).toHaveLength(10);
    seedMockAffiliateScenario();
    expect(affiliateMockState().referrals.get(scenario.customerId)?.month).toBe('2026-10');
    expect(affiliateMockState().agents.get(scenario.ownerId)?.bank?.bankName).toBe('ACB');
  });
  it('retains all history and coherent fee timing while testing 409 then successful retry', () => {
    seedMockAffiliateScenario({ payout: true });
    const state = affiliateMockState();
    expect(state.referrals.size).toBe(51);
    // D-94 3A: mọi TV là đại lý
    expect(state.agents.size).toBe(66);
    expect(mockDb().fees.find((r) => r.userId === scenario.customerId)).toMatchObject({
      paidAt: scenario.paidAt,
      joinedAt: scenario.paidAt,
      validUntil: scenario.validUntil,
    });
    expect(state.referrals.get(scenario.customerId)).toMatchObject({
      month: scenario.month,
      // D-110: c16 Gói Cá nhân 1.200.000 × 25%
      row: { date: scenario.paidAt, status: 'recorded', commission: 300000 },
    });
    expect(payMockAffiliateMonth('admin', scenario.ownerId, scenario.month, 'retry').ok).toBe(
      false,
    );
    expect(
      mockAffiliateBank(scenario.ownerId, {
        bankName: 'BIDV',
        bankNo: '123456789',
        bankHolder: 'LE THU HA',
      }).ok,
    ).toBe(true);
    expect(payMockAffiliateMonth('admin', scenario.ownerId, scenario.month, 'retry')).toMatchObject(
      { ok: true, data: { paid: 1, amount: 300000 } },
    );
    seedMockAffiliateScenario({ payout: true });
    expect(state.agents.get(scenario.ownerId)?.bank?.bankName).toBe('BIDV');
  });
  it('can combine expiration with historical payout without enabling current-month payout', () => {
    seedMockAffiliateScenario({ payout: true, paused: true });
    // D-110: mã luôn hoạt động dù đại lý hết hạn phí
    expect(myMockAffiliate(scenario.ownerId, '')).toMatchObject({ state: 'active' });
    mockAffiliateBank(scenario.ownerId, {
      bankName: 'BIDV',
      bankNo: '123456789',
      bankHolder: 'LE THU HA',
    });
    expect(payMockAffiliateMonth('admin', scenario.ownerId, '2026-10', 'early').ok).toBe(false);
    expect(payMockAffiliateMonth('admin', scenario.ownerId, scenario.month, 'old').ok).toBe(true);
  });
});
