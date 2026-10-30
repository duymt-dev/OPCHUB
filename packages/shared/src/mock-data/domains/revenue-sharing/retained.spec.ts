import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMockDb } from '../store';
import {
  captureMockAffiliateSnapshot,
  restoreMockAffiliateSnapshot,
} from '../affiliate-persistence/snapshot';
import { revokeMockDirector } from '../regional-directors/write';
import { captureMockRevenue } from './capture';
import { mockRevenueRetained } from './retained';
import { seedMockRevenueScenario } from './scenario';
import { payMockDirectorRevenue } from './payout';
import { NOW, earn, northSlot, receipt, revenueCustomer } from './revenue.fixture';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  resetMockDb();
});
afterEach(() => vi.useRealTimers());
describe('REQ-617 MSW retained scopes', () => {
  it('empty ledger is zero, never legacy reference commission net', () => {
    expect(mockRevenueRetained()).toEqual({ allReceipts: '0', affiliateAttributed: '0' });
  });
  it('same functional demo separates direct receipts and remains unchanged after revoke/pay/reload', () => {
    seedMockRevenueScenario();
    const expected = { allReceipts: '6720000', affiliateAttributed: '3120000' };
    expect(mockRevenueRetained()).toEqual(expected);
    expect(revokeMockDirector('admin', 'north', { version: northSlot().version }, NOW).ok).toBe(
      true,
    );
    expect(mockRevenueRetained()).toEqual(expected);
    expect(payMockDirectorRevenue('admin', 'm3', '2026-09', 'retained', NOW).ok).toBe(true);
    expect(mockRevenueRetained()).toEqual(expected);
    const snapshot = captureMockAffiliateSnapshot();
    resetMockDb();
    restoreMockAffiliateSnapshot(JSON.parse(JSON.stringify(snapshot)));
    expect(mockRevenueRetained()).toEqual(expected);
  });
  it('vacant attribution belongs to both scopes; direct registration only to all', () => {
    const customer = revenueCustomer();
    northSlot().incumbent = null;
    earn(customer.id);
    earn('m2');
    expect(mockRevenueRetained()).toEqual({ allReceipts: '202', affiliateAttributed: '101' });
  });
  it('drains once and never double counts a replayed receipt', () => {
    const r = receipt(revenueCustomer().id);
    captureMockRevenue(r);
    expect(mockRevenueRetained()).toEqual({ allReceipts: '50', affiliateAttributed: '50' });
    captureMockRevenue(r);
    expect(mockRevenueRetained()).toEqual({ allReceipts: '50', affiliateAttributed: '50' });
  });
  it('late older receipt updates unpaid retained amounts instead of freezing a cached summary', () => {
    const customer = revenueCustomer();
    earn(customer.id);
    expect(mockRevenueRetained().affiliateAttributed).toBe('50');
    earn(customer.id, { receivedAt: '2025-10-15T03:00:00Z' });
    expect(mockRevenueRetained()).toEqual({ allReceipts: '111', affiliateAttributed: '111' });
  });
});
