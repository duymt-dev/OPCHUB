import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readMockAffiliatePolicy } from '../affiliate-policy';
import { saveMockAffiliatePolicy } from '../affiliate-admin/write';
import {
  captureMockAffiliateSnapshot,
  restoreMockAffiliateSnapshot,
} from '../affiliate-persistence/snapshot';
import { auditLog } from '../audit-store';
import { resetMockDb } from '../store';
import { captureMockRevenue, drainMockRevenue } from './capture';
import { mockRevenueState } from './state';
import { NOW, receipt, revenueCustomer } from './revenue.fixture';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  resetMockDb();
});
afterEach(() => vi.useRealTimers());
describe('REQ-617 MSW configured policy and snapshot boundary', () => {
  it('uses one saved policy for subsequent receipts, not already captured money', () => {
    const customer = revenueCustomer();
    const first = receipt(customer.id);
    captureMockRevenue(first);
    const before = readMockAffiliatePolicy();
    const next = { ...before, yearOneRate: 63, annualDecrease: 7, minimumRate: 21 };
    expect(saveMockAffiliatePolicy('admin', next).ok).toBe(true);
    expect(readMockAffiliatePolicy()).toEqual(next);
    expect(mockRevenueState().policy).toEqual({
      yearOneRate: 63,
      annualDecrease: 7,
      minimumRate: 21,
    });
    expect(drainMockRevenue().shares[0]).toMatchObject({ directorRate: 50, directorAmount: 51 });
    captureMockRevenue({ ...first, sourceId: 'after-edit' });
    expect(drainMockRevenue().shares[1]).toMatchObject({ directorRate: 63, directorAmount: 64 });
    expect(auditLog().find((r) => r.action === 'affiliate.policy_update')?.diff).toEqual({
      before,
      after: next,
    });
    const frozen = captureMockAffiliateSnapshot();
    resetMockDb();
    restoreMockAffiliateSnapshot(frozen);
    expect(readMockAffiliatePolicy()).toEqual(next);
    expect(captureMockAffiliateSnapshot()).toEqual(frozen);
  });
  it('invalid floor cannot write, recalculate or append an audit', () => {
    const before = readMockAffiliatePolicy();
    const count = auditLog().length;
    expect(saveMockAffiliatePolicy('admin', { ...before, minimumRate: 51 }).ok).toBe(false);
    expect(readMockAffiliatePolicy()).toEqual(before);
    expect(auditLog()).toHaveLength(count);
  });
  it('restores old financial snapshots with sharing policy owned by revenue only', () => {
    const snapshot = captureMockAffiliateSnapshot();
    expect(snapshot.policy).not.toHaveProperty('yearOneRate');
    snapshot.revenue = {
      ...mockRevenueState(),
      policy: { yearOneRate: 71, annualDecrease: 3, minimumRate: 11 },
    };
    resetMockDb();
    restoreMockAffiliateSnapshot(snapshot);
    expect(readMockAffiliatePolicy()).toMatchObject(snapshot.revenue.policy);
    const legacy = { ...snapshot };
    delete legacy.revenue;
    resetMockDb();
    restoreMockAffiliateSnapshot(legacy);
    expect(readMockAffiliatePolicy()).toMatchObject(mockRevenueState().policy);
    expect(mockRevenueState().shares).toEqual([]);
  });
});
