import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  affiliateCancelResultSchema,
  affiliateCommissionsSchema,
  affiliatePayoutResultSchema,
  affiliatePolicySchema,
  affiliateRateResultSchema,
  csvFileSchema,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';
import {
  affiliateKeys,
  cancelCommissions,
  exportAffiliates,
  exportCommissions,
  fetchAffiliateCustomers,
  fetchAffiliateDetail,
  fetchAffiliateMonths,
  fetchAffiliatePolicy,
  fetchAffiliates,
  fetchAffiliateSummary,
  fetchCommissions,
  payAffiliateMonth,
  saveAffiliatePolicy,
  setAffiliateRate,
  setAffiliateRates,
} from './api';

vi.mock('@/lib/api-client', () => ({ api: vi.fn() }));
const request = vi.mocked(api);
beforeEach(() => request.mockReset());

describe('REQ-312 Affiliate Admin API contract wiring', () => {
  it('serializes server paging/search/month/status and shares the schema contract', async () => {
    await fetchCommissions({
      page: 2,
      size: 10,
      q: 'Hà & An',
      month: '2026-09',
      status: 'recorded',
    });
    const [path, options] = request.mock.calls[0]!;
    const url = new URL(path, 'https://example.invalid');
    expect(url.pathname).toBe('/admin/affiliate/commissions');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: '2',
      size: '10',
      q: 'Hà & An',
      month: '2026-09',
      status: 'recorded',
    });
    expect(options.schema).toBe(affiliateCommissionsSchema);
    await fetchCommissions({ page: 1, size: 10, status: 'all' });
    expect(request.mock.calls[1]![0]).toBe('/admin/affiliate/commissions?page=1&size=10');
  });

  it('routes each read to its dedicated endpoint with encoded ids', async () => {
    await fetchAffiliates({ page: 1, size: 20 });
    await fetchAffiliateDetail('a/b');
    await fetchAffiliateMonths('a/b', { page: 2, size: 10 });
    await fetchAffiliateCustomers('a/b', { page: 3, size: 10 });
    await fetchAffiliateSummary();
    await fetchAffiliateSummary('2026-09');
    expect(request.mock.calls.map(([path]) => path)).toEqual([
      '/admin/affiliates?page=1&size=20',
      '/admin/affiliates/a%2Fb',
      '/admin/affiliates/a%2Fb/months?page=2&size=10',
      '/admin/affiliates/a%2Fb/customers?page=3&size=10',
      '/admin/affiliate/summary',
      '/admin/affiliate/summary?month=2026-09',
    ]);
  });

  it('REQ-310 sends cancellation ids and reason, never an arbitrary status patch', async () => {
    await cancelCommissions(['c1', 'c2'], 'Vi phạm điều khoản');
    expect(request).toHaveBeenCalledWith('/admin/affiliate/commissions/cancel', {
      method: 'POST',
      body: { ids: ['c1', 'c2'], reason: 'Vi phạm điều khoản' },
      schema: affiliateCancelResultSchema,
    });
  });

  it('REQ-308 separates individual rate PATCH and bulk rate PUT', async () => {
    await setAffiliateRate('a1', 30);
    await setAffiliateRates(['a1', 'a2'], 25);
    expect(request).toHaveBeenNthCalledWith(1, '/admin/affiliates/a1', {
      method: 'PATCH',
      body: { rate: 30 },
      schema: affiliateRateResultSchema,
    });
    expect(request).toHaveBeenNthCalledWith(2, '/admin/affiliates/rate', {
      method: 'PUT',
      body: { ids: ['a1', 'a2'], rate: 25 },
      schema: affiliateRateResultSchema,
    });
  });

  it('REQ-309 preserves caller idempotency key on payout retry, sends no client total', async () => {
    await payAffiliateMonth('a1', '2026-09', 'same-financial-intent');
    await payAffiliateMonth('a1', '2026-09', 'same-financial-intent');
    expect(request.mock.calls[0]).toEqual(request.mock.calls[1]);
    expect(request).toHaveBeenCalledWith('/admin/affiliates/a1/payouts', {
      method: 'POST',
      body: { monthKey: '2026-09' },
      idempotencyKey: 'same-financial-intent',
      schema: affiliatePayoutResultSchema,
    });
  });

  it('uses policy GET/PUT and audited export endpoints with the CSV response schema', async () => {
    const policy = { defaultRate: 20, cookieDays: 30, fundraisingRate: 10, terms: 'Điều khoản' };
    await fetchAffiliatePolicy();
    await saveAffiliatePolicy(policy);
    await exportCommissions({ ids: ['c1'], status: 'recorded' });
    await exportAffiliates({ q: 'Hà' });
    expect(request).toHaveBeenNthCalledWith(1, '/admin/affiliate/policy', {
      schema: affiliatePolicySchema,
    });
    expect(request).toHaveBeenNthCalledWith(2, '/admin/affiliate/policy', {
      method: 'PUT',
      body: policy,
      schema: affiliatePolicySchema,
    });
    expect(request).toHaveBeenNthCalledWith(3, '/admin/affiliate/commissions/export', {
      method: 'POST',
      body: { ids: ['c1'], status: 'recorded' },
      schema: csvFileSchema,
    });
    expect(request).toHaveBeenNthCalledWith(4, '/admin/affiliates/export', {
      method: 'POST',
      body: { q: 'Hà' },
      schema: csvFileSchema,
    });
  });

  it('isolates list/detail/tab/filter query keys under one invalidation root', () => {
    const p = { page: 1, size: 10 };
    const keys = [
      affiliateKeys.summary(),
      affiliateKeys.commissions({ ...p, status: 'all' }),
      affiliateKeys.agents(p),
      affiliateKeys.detail('a1'),
      affiliateKeys.months('a1', p),
      affiliateKeys.customers('a1', p),
      affiliateKeys.policy,
    ];
    expect(new Set(keys.map((key) => JSON.stringify(key))).size).toBe(keys.length);
    for (const key of keys) expect(key[0]).toBe(affiliateKeys.all[0]);
    expect(affiliateKeys.summary('2026-09')).not.toEqual(affiliateKeys.summary('2026-10'));
    expect(affiliateKeys.months('a2', p)).not.toEqual(affiliateKeys.months('a1', p));
  });
});
