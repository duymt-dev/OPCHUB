import type { MyAffiliate } from '@opchub/shared/api-domains';
import { mockLogin } from '@opchub/shared/mock-data';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/lib/auth-store';
import * as api from '../api';
import { useAffiliate } from './use-affiliate';

const locked: MyAffiliate = {
  state: 'locked',
  policy: { rate: 20, perAmount: 120000, cookieDays: 30 },
};
const active: MyAffiliate = {
  state: 'active',
  policy: locked.policy,
  code: 'OPCAN26',
  link: 'https://opchub.community/r/OPCAN26',
  bank: null,
  stats: {
    clicks30d: 0,
    paidCount: 0,
    conversionPct: 0,
    thisMonth: 0,
    carryOver: 0,
    received: 0,
  },
};
let client: QueryClient;
function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
const tick = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};
function session(status: 'active' | 'expiring' | 'pending_payment' | 'expired') {
  const login = mockLogin('an.nguyen@mediasoft.vn', 'User@2026');
  if (!login.ok) throw new Error('Missing demo member');
  const me = login.me;
  if (!me.membershipFee) throw new Error('Missing demo membership');
  useAuthStore.getState().setSession('test-only', {
    ...me,
    membershipFee: { ...me.membershipFee, status },
  });
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-20T04:00:00Z'));
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });
  session('active');
});
afterEach(() => {
  cleanup();
  client.clear();
  useAuthStore.getState().clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Affiliate freshness', () => {
  it('REQ-302 REQ-311 paid preview retries outbox lag then stops when affiliate appears', async () => {
    const fetch = vi
      .spyOn(api, 'fetchAffiliate')
      .mockResolvedValueOnce(locked)
      .mockResolvedValue(active);
    const { result } = renderHook(useAffiliate, { wrapper: Wrapper });
    await tick(50);
    expect(result.current.data?.state).toBe('locked');
    await tick(2_050);
    expect(result.current.data?.state).toBe('active');
    expect(fetch).toHaveBeenCalledTimes(2);
    await tick(10_000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('REQ-311 renewed member retries paused state until activation consumer completes', async () => {
    session('expiring');
    const fetch = vi
      .spyOn(api, 'fetchAffiliate')
      .mockResolvedValueOnce({ ...active, state: 'paused' })
      .mockResolvedValue(active);
    const { result } = renderHook(useAffiliate, { wrapper: Wrapper });
    await tick(50);
    expect(result.current.data?.state).toBe('paused');
    await tick(2_050);
    expect(result.current.data?.state).toBe('active');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('REQ-302 unpaid preview does not poll, fee confirmation immediately changes query', async () => {
    session('pending_payment');
    const fetch = vi.spyOn(api, 'fetchAffiliate').mockResolvedValue(locked);
    const { result } = renderHook(useAffiliate, { wrapper: Wrapper });
    await tick(10_000);
    expect(fetch).toHaveBeenCalledTimes(1);
    fetch.mockResolvedValue(active);
    act(() => session('active'));
    await tick(50);
    expect(result.current.data?.state).toBe('active');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('REQ-311 failed request does not start a polling error loop', async () => {
    const fetch = vi.spyOn(api, 'fetchAffiliate').mockRejectedValue(new Error('offline'));
    const { result } = renderHook(useAffiliate, { wrapper: Wrapper });
    await tick(10_000);
    expect(result.current.isError).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('REQ-311 expired paused affiliate does not poll for a renewal that has not happened', async () => {
    session('expired');
    const fetch = vi.spyOn(api, 'fetchAffiliate').mockResolvedValue({ ...active, state: 'paused' });
    const { result } = renderHook(useAffiliate, { wrapper: Wrapper });
    await tick(10_000);
    expect(result.current.data?.state).toBe('paused');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('REQ-311 transient outbox retry stops polling after a transport error', async () => {
    const fetch = vi
      .spyOn(api, 'fetchAffiliate')
      .mockResolvedValueOnce(locked)
      .mockRejectedValue(new Error('offline'));
    const { result } = renderHook(useAffiliate, { wrapper: Wrapper });
    await tick(50);
    await tick(2_050);
    expect(result.current.isError).toBe(true);
    await tick(10_000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('REQ-311 VN midnight refreshes rolling stats even inside staleTime, not every minute', async () => {
    vi.setSystemTime(new Date('2026-10-31T16:59:59Z'));
    const fetch = vi.spyOn(api, 'fetchAffiliate').mockResolvedValue(active);
    renderHook(useAffiliate, { wrapper: Wrapper });
    await tick(50);
    expect(fetch).toHaveBeenCalledTimes(1);
    // Keep old cache fresh longer than a day: a VN date change must select a new key.
    client.setQueryDefaults(api.affiliateKeys.mine, { staleTime: Infinity });
    await tick(60_050);
    expect(fetch).toHaveBeenCalledTimes(2);
    const keys = client
      .getQueryCache()
      .getAll()
      .map((q) => q.queryKey);
    expect(keys).toContainEqual([...api.affiliateKeys.mine, 'active', '2026-11-01']);
    await tick(120_000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
