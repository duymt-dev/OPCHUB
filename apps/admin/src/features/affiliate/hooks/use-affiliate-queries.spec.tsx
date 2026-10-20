import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCan } from '@/lib/permissions';
import * as api from '../api';
import { affiliateParamsSchema } from '../model';
import { affiliateTestContext } from '../tests/context';
import type { AffiliateDetail } from '../types';
import { useAffiliateQueries } from './use-affiliate-queries';
import { useAffiliateDetail } from './use-affiliate-detail';

vi.mock('@/lib/permissions', () => ({ useCan: vi.fn() }));
vi.mock('../api', async (original) => ({
  ...(await original<typeof api>()),
  fetchAffiliateSummary: vi.fn(),
  fetchCommissions: vi.fn(),
  fetchAffiliates: vi.fn(),
  fetchAffiliatePolicy: vi.fn(),
  fetchAffiliateDetail: vi.fn(),
  fetchAffiliateMonths: vi.fn(),
  fetchAffiliateCustomers: vi.fn(),
}));
const detail: AffiliateDetail = {
  id: 'a1',
  userId: 'u1',
  name: 'Agent',
  email: 'agent@example.com',
  code: 'AGENT',
  rate: 20,
  status: 'active',
  source: 'auto',
  customers: 0,
  revenue: 0,
  balance: 0,
  paid: 0,
  monthStatus: 'recorded',
  hasBank: false,
  bank: null,
  stats: { customers: 0, revenue: 0, commission: 0, paid: 0 },
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useCan).mockReturnValue(true);
  const empty = { items: [], total: 0, page: 1, size: 10 };
  vi.mocked(api.fetchCommissions).mockResolvedValue({ ...empty, total: 51 });
  vi.mocked(api.fetchAffiliates).mockResolvedValue({ ...empty, total: 62 });
  vi.mocked(api.fetchAffiliateSummary).mockResolvedValue({
    revenue: 0,
    totalCommission: 0,
    payable: 0,
    paid: 0,
    netRevenue: 0,
  });
  vi.mocked(api.fetchAffiliatePolicy).mockResolvedValue({
    defaultRate: 20,
    cookieDays: 30,
    terms: '',
  });
  vi.mocked(api.fetchAffiliateDetail).mockResolvedValue(detail);
  vi.mocked(api.fetchAffiliateMonths).mockResolvedValue(empty);
  vi.mocked(api.fetchAffiliateCustomers).mockResolvedValue(empty);
});
afterEach(cleanup);

describe('REQ-312 permission-gated Affiliate query orchestration', () => {
  it('does not request any list/summary/policy without affiliate.view', () => {
    vi.mocked(useCan).mockReturnValue(false);
    const { result } = renderHook(
      () => useAffiliateQueries(affiliateParamsSchema.parse({})),
      affiliateTestContext(),
    );
    expect(result.current.summary.fetchStatus).toBe('idle');
    for (const fn of [
      api.fetchAffiliateSummary,
      api.fetchCommissions,
      api.fetchAffiliates,
      api.fetchAffiliatePolicy,
    ]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it('fetches only the active list plus unfiltered server tab totals; no client page-length counts', async () => {
    const params = affiliateParamsSchema.parse({
      q: 'Hà',
      month: '2026-09',
      status: 'recorded',
      page: 2,
    });
    const { result } = renderHook(() => useAffiliateQueries(params), affiliateTestContext());
    await waitFor(() => expect(result.current.counts).toEqual({ com: 51, aff: 62 }));
    expect(api.fetchCommissions).toHaveBeenCalledWith({
      page: 2,
      size: 10,
      q: 'Hà',
      month: '2026-09',
      status: 'recorded',
    });
    expect(api.fetchCommissions).toHaveBeenCalledWith({ page: 1, size: 1, status: 'all' });
    expect(api.fetchAffiliates).toHaveBeenCalledExactlyOnceWith({ page: 1, size: 1 });
    expect(api.fetchAffiliatePolicy).not.toHaveBeenCalled();
    expect(api.fetchAffiliateSummary).toHaveBeenCalledExactlyOnceWith();
  });

  it('loads agent/policy tabs on demand and omits empty month filters', async () => {
    const { result, rerender } = renderHook((params) => useAffiliateQueries(params), {
      ...affiliateTestContext(),
      initialProps: affiliateParamsSchema.parse({ tab: 'aff' }),
    });
    await waitFor(() => expect(result.current.agents.isSuccess).toBe(true));
    expect(api.fetchAffiliates).toHaveBeenCalledWith({ page: 1, size: 10, q: '' });
    expect(api.fetchAffiliatePolicy).not.toHaveBeenCalled();
    rerender(affiliateParamsSchema.parse({ tab: 'cfg' }));
    await waitFor(() => expect(result.current.policy.isSuccess).toBe(true));
    expect(api.fetchAffiliatePolicy).toHaveBeenCalledTimes(1);
  });

  it('exposes backend read errors rather than silently replacing them with an empty success', async () => {
    vi.mocked(api.fetchCommissions).mockRejectedValue(new Error('Unavailable'));
    const { result } = renderHook(
      () => useAffiliateQueries(affiliateParamsSchema.parse({})),
      affiliateTestContext(),
    );
    await waitFor(() => expect(result.current.commissions.isError).toBe(true));
    expect(result.current.commissions.data).toBeUndefined();
  });

  it('fetches detail and only its active history tab, with id/page in the key', async () => {
    const { result, rerender } = renderHook(
      (params: { tab: 'months' | 'customers'; page: number; size: number }) =>
        useAffiliateDetail('a1', params),
      { ...affiliateTestContext(), initialProps: { tab: 'months', page: 2, size: 10 } },
    );
    await waitFor(() => expect(result.current.months.isSuccess).toBe(true));
    expect(api.fetchAffiliateDetail).toHaveBeenCalledWith('a1');
    expect(api.fetchAffiliateMonths).toHaveBeenCalledWith('a1', { page: 2, size: 10 });
    expect(api.fetchAffiliateCustomers).not.toHaveBeenCalled();
    rerender({ tab: 'customers', page: 1, size: 10 });
    await waitFor(() => expect(result.current.customers.isSuccess).toBe(true));
    expect(api.fetchAffiliateCustomers).toHaveBeenCalledWith('a1', { page: 1, size: 10 });
  });

  it('blocks detail/month/customer reads without view permission', () => {
    vi.mocked(useCan).mockReturnValue(false);
    renderHook(
      () => useAffiliateDetail('a1', { tab: 'months', page: 1, size: 10 }),
      affiliateTestContext(),
    );
    expect(api.fetchAffiliateDetail).not.toHaveBeenCalled();
    expect(api.fetchAffiliateMonths).not.toHaveBeenCalled();
    expect(api.fetchAffiliateCustomers).not.toHaveBeenCalled();
    expect(api.fetchAffiliatePolicy).not.toHaveBeenCalled();
  });

  it('uses the shared policy query for actual attribution days and refreshes after invalidation', async () => {
    vi.mocked(api.fetchAffiliatePolicy).mockResolvedValue({
      defaultRate: 20,
      cookieDays: 45,
      terms: '',
    });
    const context = affiliateTestContext();
    const { result } = renderHook(
      () => useAffiliateDetail('a1', { tab: 'months', page: 1, size: 10 }),
      context,
    );
    await waitFor(() => expect(result.current.policy.data?.cookieDays).toBe(45));
    expect(api.fetchAffiliatePolicy).toHaveBeenCalledTimes(1);
    vi.mocked(api.fetchAffiliatePolicy).mockResolvedValue({
      defaultRate: 20,
      cookieDays: 17,
      terms: '',
    });
    await context.client.invalidateQueries({ queryKey: api.affiliateKeys.policy });
    await waitFor(() => expect(result.current.policy.data?.cookieDays).toBe(17));
    expect(api.fetchAffiliatePolicy).toHaveBeenCalledTimes(2);
  });

  it('does not request global policy or agent data for an empty detail id', () => {
    renderHook(
      () => useAffiliateDetail('', { tab: 'months', page: 1, size: 10 }),
      affiliateTestContext(),
    );
    expect(api.fetchAffiliatePolicy).not.toHaveBeenCalled();
    expect(api.fetchAffiliateDetail).not.toHaveBeenCalled();
    expect(api.fetchAffiliateMonths).not.toHaveBeenCalled();
  });
});
