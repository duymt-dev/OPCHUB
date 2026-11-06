import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGrants } from '@/lib/permissions';
import * as api from '../api';
import { affiliateTestContext } from '../tests/context';
import { useAffiliateWrites } from './use-affiliate-writes';

vi.mock('@/lib/permissions', () => ({ useGrants: vi.fn() }));
vi.mock('../api', async (original) => ({
  ...(await original<typeof api>()),
  cancelCommissions: vi.fn(),
  setAffiliateRate: vi.fn(),
  setAffiliateRates: vi.fn(),
  saveAffiliatePolicy: vi.fn(),
  exportCommissions: vi.fn(),
  exportAffiliates: vi.fn(),
}));
const all = ['affiliate.view', 'affiliate.action', 'affiliate.payout'];
const policy = {
  renewalRate: 10,
  renewalMaxYear: 3,
  regionalFirstYear: 50,
  regionalStep: 10,
  regionalMin: 20,
  defaultRate: 20,
  cookieDays: 30,
  fundraisingRate: 10,
  terms: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useGrants).mockReturnValue({ keys: all, roleName: 'Test role', previewing: false });
  vi.mocked(api.cancelCommissions).mockResolvedValue({ cancelled: 2 });
  vi.mocked(api.setAffiliateRate).mockResolvedValue({ updated: 1 });
  vi.mocked(api.setAffiliateRates).mockResolvedValue({ updated: 2 });
  vi.mocked(api.saveAffiliatePolicy).mockResolvedValue(policy);
});
afterEach(cleanup);

describe('REQ-308 REQ-309 REQ-310 Affiliate mutation permissions', () => {
  it('view-only blocks every write and both exports at the mutation boundary', async () => {
    vi.mocked(useGrants).mockReturnValue({
      keys: ['affiliate.view'],
      roleName: 'Read only',
      previewing: false,
    });
    const { result } = renderHook(useAffiliateWrites, affiliateTestContext());
    await act(async () => {
      expect(
        await result.current.cancel.mutateAsync({ ids: ['c1'], reason: 'Violation' }),
      ).toBeNull();
      expect(await result.current.rates.mutateAsync({ ids: ['a1'], rate: 30 })).toBeNull();
      expect(await result.current.policy.mutateAsync(policy)).toBeNull();
      expect(await result.current.csv.mutateAsync({ type: 'com', ids: ['c1'] })).toBeNull();
      expect(await result.current.csv.mutateAsync({ type: 'aff', ids: ['a1'] })).toBeNull();
    });
    for (const fn of [
      api.cancelCommissions,
      api.setAffiliateRate,
      api.setAffiliateRates,
      api.saveAffiliatePolicy,
      api.exportCommissions,
      api.exportAffiliates,
    ]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it('preview blocks writes even when the previewed role has all permission keys', async () => {
    vi.mocked(useGrants).mockReturnValue({ keys: all, roleName: 'Preview', previewing: true });
    const { result } = renderHook(useAffiliateWrites, affiliateTestContext());
    expect(result.current.access.view).toBe(true);
    expect(result.current.access.write).toBe(false);
    expect(result.current).not.toHaveProperty('payout');
    await act(async () => {});
  });

  it('action permission can cancel/rate but cannot authorize payout', async () => {
    vi.mocked(useGrants).mockReturnValue({
      keys: ['affiliate.view', 'affiliate.action'],
      roleName: 'Same name',
      previewing: false,
    });
    const hook = renderHook(useAffiliateWrites, affiliateTestContext());
    await act(async () => {
      await hook.result.current.cancel.mutateAsync({ ids: ['c1', 'c2'], reason: 'Violation' });
    });
    expect(api.cancelCommissions).toHaveBeenCalledWith(['c1', 'c2'], 'Violation');
  });

  it('individual and bulk rates use their dedicated API and invalidate the shared root', async () => {
    const context = affiliateTestContext();
    const invalidate = vi.spyOn(context.client, 'invalidateQueries');
    const { result } = renderHook(useAffiliateWrites, context);
    await act(async () => {
      await result.current.rates.mutateAsync({ ids: ['a1'], rate: 30 });
      await result.current.rates.mutateAsync({ ids: ['a1', 'a2'], rate: 25 });
    });
    expect(api.setAffiliateRate).toHaveBeenCalledWith('a1', 30);
    expect(api.setAffiliateRates).toHaveBeenCalledWith(['a1', 'a2'], 25);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: api.affiliateKeys.all });
  });

  it('payout-only permission does not grant rate changes; role names do not grant anything', async () => {
    vi.mocked(useGrants).mockReturnValue({
      keys: ['affiliate.view', 'affiliate.payout'],
      roleName: 'Same name',
      previewing: false,
    });
    const { result } = renderHook(useAffiliateWrites, affiliateTestContext());
    await act(async () => {
      await result.current.rates.mutateAsync({ ids: ['a1'], rate: 30 });
    });
    expect(api.setAffiliateRate).not.toHaveBeenCalled();
  });
});
