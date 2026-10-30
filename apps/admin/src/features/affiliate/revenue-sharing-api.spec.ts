import { beforeEach, describe, expect, it, vi } from 'vitest';
import { revenueDashboardSchema, revenuePayoutSchema } from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';
import {
  fetchRevenueDashboard,
  fetchRevenueLedger,
  fetchRevenueHistory,
  fetchRevenueMonths,
  fetchFormerRevenueDirectors,
  payDirectorRevenue,
} from './revenue-sharing-api';

vi.mock('@/lib/api-client', () => ({ api: vi.fn() }));
beforeEach(() => vi.mocked(api).mockReset());
describe('REQ-617 revenue API wiring', () => {
  it('uses the dashboard contract and encoded beneficiary-scoped keyset requests', async () => {
    await fetchRevenueDashboard();
    expect(api).toHaveBeenCalledWith('/admin/affiliate/revenue/dashboard', {
      schema: revenueDashboardSchema,
    });
    const cursor = { at: '2026-09-01T00:00:00Z', id: '019b76da-a800-7000-8000-000000000001' };
    await fetchRevenueLedger('a/b', cursor);
    const [path] = vi.mocked(api).mock.calls[1]!;
    const url = new URL(path, 'http://local');
    expect(url.pathname).toBe('/admin/affiliate/revenue/a%2Fb/shares');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      size: '8',
      beforeAt: cursor.at,
      beforeId: cursor.id,
    });
    await fetchRevenueDashboard(' Bắc & Nam ');
    expect(vi.mocked(api).mock.calls[2]?.[0]).toBe(
      '/admin/affiliate/revenue/dashboard?q=B%E1%BA%AFc+%26+Nam',
    );
  });
  it('keeps payout history, month cursors and former-beneficiary cursors separate', async () => {
    await fetchRevenueHistory('d&1', null);
    await fetchRevenueMonths('d/1', '2026-09');
    await fetchFormerRevenueDirectors('z&1');
    expect(vi.mocked(api).mock.calls.map(([path]) => path)).toEqual([
      '/admin/affiliate/revenue/payouts?size=20&directorId=d%261',
      '/admin/affiliate/revenue/d%2F1/months?size=20&beforeMonth=2026-09',
      '/admin/affiliate/revenue/former?size=20&beforeId=z%261',
    ]);
  });
  it('sends only the approved month body with stable caller retry key, never client amounts/bank', async () => {
    await payDirectorRevenue('d/1', '2026-09', 'retry-key');
    expect(api).toHaveBeenCalledWith('/admin/affiliate/revenue/d%2F1/payouts', {
      method: 'POST',
      body: { monthKey: '2026-09' },
      idempotencyKey: 'retry-key',
      schema: revenuePayoutSchema,
    });
  });
});
