import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb, resetMockDb } from '../store';
import {
  revenueStats,
  mockRevenueBalance,
  mockRevenueHistory,
  mockRevenueLedger,
  mockRevenueMonths,
} from './read';
import { mockRevenueDashboard } from './dashboard';
import { drainMockRevenue } from './capture';
import { mockRevenueState } from './state';
import { payMockDirectorRevenue } from './payout';
import { NOW, revenueCustomer, earn } from './revenue.fixture';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  resetMockDb();
});
afterEach(() => vi.useRealTimers());
describe('REQ-617 mock revenue reads', () => {
  it('preserves arbitrary aggregate precision without Number conversion', () => {
    earn(revenueCustomer().id);
    const share = drainMockRevenue().shares[0]!;
    // Explicit aggregation boundary fixture, not a persisted individual PostgreSQL Int receipt.
    const stats = revenueStats([
      {
        ...share,
        amount: Number.MAX_SAFE_INTEGER,
        directorAmount: Number.MAX_SAFE_INTEGER,
        mediaSoftAmount: 0,
      },
      share,
    ]);
    expect(stats.received).toBe('9007199254741092');
    expect(stats.allocated).toBe('9007199254741042');
  });
  it('reads current policy but keeps earned rates immutable; search only filters due/paid', () => {
    earn(revenueCustomer().id);
    drainMockRevenue();
    mockRevenueState().policy = { yearOneRate: 61, annualDecrease: 9, minimumRate: 22 };
    const all = mockRevenueDashboard(),
      filtered = mockRevenueDashboard('Miền Nam');
    expect(all.policy).toEqual(mockRevenueState().policy);
    expect(all.stats).toMatchObject({ allocated: '51', due: '51' });
    expect(filtered.stats).toEqual(all.stats);
    expect(filtered.visible).toEqual({ ids: ['south'], due: '0', paid: '0' });
  });
  it('keysets history/months and preserves money when display identity is missing', () => {
    const c = revenueCustomer();
    earn(c.id, { recordedAt: '2026-09-01T03:00:00.000Z' });
    earn(c.id);
    const months = mockRevenueMonths('m3', { size: 1 });
    expect(months).toMatchObject({
      ok: true,
      data: { items: [{ monthKey: '2026-10', due: '51' }], nextCursor: '2026-10' },
    });
    expect(mockRevenueMonths('m3', { size: 1, beforeMonth: '2026-10' })).toMatchObject({
      data: { items: [{ monthKey: '2026-09' }], nextCursor: null },
    });
    expect(payMockDirectorRevenue('admin', 'm3', '2026-09', 'sep', NOW).ok).toBe(true);
    expect(payMockDirectorRevenue('admin', 'm3', '2026-10', 'oct', NOW).ok).toBe(true);
    const first = mockRevenueHistory({ size: 1 }),
      cursor = first.nextCursor!;
    const next = mockRevenueHistory({ size: 1, beforeAt: cursor.at, beforeId: cursor.id });
    expect(next.items).toHaveLength(1);
    expect(next.nextCursor).toBeNull();
    expect(next.items[0]?.id).not.toBe(first.items[0]?.id);
    mockDb().fees = mockDb().fees.filter((f) => f.userId !== c.id);
    expect(mockRevenueLedger('m3', { size: 8 })).toMatchObject({
      data: { items: [{ customerName: null }, { customerName: null }] },
    });
    expect(mockRevenueBalance('m3')).toMatchObject({ data: { paid: '102' } });
  });
});
