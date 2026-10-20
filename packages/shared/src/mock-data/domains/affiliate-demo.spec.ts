import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { affiliateDemoCustomers } from '../../fixtures';
import {
  affiliateMockState,
  checkMockAffiliate,
  mockAffiliateBank,
  mockAffiliatePayouts,
  mockAffiliateReferrals,
  myMockAffiliate,
} from './affiliate';
import { mockAffiliateDemoLogin, seedMockAffiliateScenario } from './affiliate-demo';
import { mockDb, resetMockDb } from './store';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-18T00:00:00+07:00'));
  resetMockDb();
});
afterEach(() => vi.useRealTimers());
describe('Affiliate AF0 mock scenario', () => {
  it('REQ-303 opt-in only, reset drops extra users, HAOPC and financial history', () => {
    expect(checkMockAffiliate('HAOPC').valid).toBe(false);
    expect(mockDb().fees).toHaveLength(8);
    seedMockAffiliateScenario();
    expect(checkMockAffiliate('HAOPC')).toMatchObject({ valid: true, affiliateName: 'Lê Thu Hà' });
    expect(mockDb().fees).toHaveLength(64);
    expect(affiliateMockState().agents.size).toBe(62);
    resetMockDb();
    expect(checkMockAffiliate('HAOPC').valid).toBe(false);
    expect(mockDb().fees).toHaveLength(8);
  });
  it('REQ-311 same totals and payouts as native fixture; privacy masking and actual pagination', () => {
    seedMockAffiliateScenario();
    expect(myMockAffiliate('m1', 'https://example.test')).toMatchObject({
      state: 'active',
      stats: {
        clicks30d: 412,
        paidCount: 9,
        conversionPct: 2.2,
        thisMonth: 360000,
        carryOver: 0,
        received: 720000,
      },
    });
    const refs = mockAffiliateReferrals('m1', { page: 2, size: 6 });
    expect(refs.total).toBe(9);
    expect(refs.items).toHaveLength(3);
    expect(refs.items.every((r) => r.name.endsWith('.'))).toBe(true);
    const payouts = mockAffiliatePayouts('m1', { page: 1, size: 6 });
    expect(payouts.total).toBe(2);
    expect(payouts.items.map((p) => p.monthKey)).toEqual(['2026-09', '2026-08']);
    expect(payouts.items.reduce((n, p) => n + p.amount, 0)).toBe(720000);
  });
  it('REQ-309 repeated middleware does not duplicate or overwrite a saved bank', () => {
    seedMockAffiliateScenario();
    mockAffiliateBank('m1', { bankName: 'ACB', bankNo: '123456789', bankHolder: 'NGUYEN VAN AN' });
    seedMockAffiliateScenario();
    expect(mockDb().fees).toHaveLength(64);
    expect(affiliateMockState().referrals.size).toBe(51);
    expect(myMockAffiliate('m1', '')).toMatchObject({ bank: { bankName: 'ACB' } });
    expect(mockAffiliatePayouts('m1', { page: 1, size: 6 }).items[0]?.bank.bankName).toBe(
      'Vietcombank',
    );
    expect(affiliateDemoCustomers.every((c) => affiliateMockState().agents.has(c.userId))).toBe(
      true,
    );
  });
  it('REQ-303 AF0 owners can sign in only after seed and only with the demo password', () => {
    expect(mockAffiliateDemoLogin('ha.le@opcmedia.vn', 'User@2026')).toBeUndefined();
    seedMockAffiliateScenario();
    expect(mockAffiliateDemoLogin('ha.le@opcmedia.vn', 'wrong')).toBeUndefined();
    expect(mockAffiliateDemoLogin('HA.LE@OPCMEDIA.VN', 'User@2026')).toMatchObject({
      ok: true,
      me: { id: 'af-owner-a3', fullName: 'Lê Thu Hà', membershipFee: { status: 'active' } },
    });
  });
});
