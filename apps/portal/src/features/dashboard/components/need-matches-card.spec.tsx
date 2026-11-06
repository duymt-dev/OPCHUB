import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NeedMatches } from '@opchub/shared/api-domains';
import { ApiError } from '@/lib/api-client';
import dashboard from '../../../../messages/vi/dashboard.json';
import needs from '../../../../messages/vi/needs.json';
import { fetchNeedMatches } from '../api';
import type * as DashboardApi from '../api';
import { NeedMatchesCard } from './need-matches-card';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../api', async (original) => ({
  ...(await original<typeof DashboardApi>()),
  fetchNeedMatches: vi.fn(),
}));
let me = { id: 'm1', accountType: 'business' };
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (select: (s: { me: typeof me }) => unknown) => select({ me }),
}));
let client: QueryClient;
const fetchMatches = vi.mocked(fetchNeedMatches);
const data: NeedMatches = {
  hasStore: true,
  storeField: 'Food',
  rows: [
    {
      id: 'n1',
      title: 'Robusta need',
      type: 'buy',
      field: 'Food',
      province: 'Dak Lak',
      pct: 98,
      reasons: ['field', 'province', 'product'],
    },
  ],
};
const view = () =>
  render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="vi" messages={{ dashboard, needs }}>
        <NeedMatchesCard />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  me = { id: 'm1', accountType: 'business' };
  push.mockReset();
  fetchMatches.mockReset().mockResolvedValue(data);
});
afterEach(() => {
  cleanup();
  client.clear();
});

describe('REQ-626 dashboard matching card', () => {
  it('renders labels/reasons/count/98% and only buttons navigate', async () => {
    view();
    await screen.findByText('Robusta need');
    expect(screen.getByText('Cần mua')).toBeDefined();
    for (const label of ['Đúng ngành', 'Cùng tỉnh', 'Khớp sản phẩm', '98%', 'mức phù hợp'])
      expect(screen.getByText(label)).toBeDefined();
    expect(screen.getByText(/AI gợi ý.*1 nhu cầu/)).toBeDefined();
    fireEvent.click(screen.getByText('Robusta need'));
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Xem & liên hệ' }));
    expect(push).toHaveBeenLastCalledWith('/needs?q=Robusta%20need');
    fireEvent.click(screen.getByRole('button', { name: 'Xem tất cả nhu cầu' }));
    expect(push).toHaveBeenLastCalledWith('/needs?field=Food');
  });
  it.each(['personal', 'investor'])(
    'no store: %s makes no API request and renders no card',
    async (accountType) => {
      me.accountType = accountType;
      const r = view();
      await waitFor(() => expect(r.container.innerHTML).toBe(''));
      expect(fetchMatches).not.toHaveBeenCalled();
    },
  );
  it('business without store hides card after response', async () => {
    fetchMatches.mockResolvedValue({ hasStore: false, storeField: null, rows: [] });
    const r = view();
    await waitFor(() => expect(fetchMatches).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(r.container.innerHTML).toBe(''));
  });
  it('none: keeps header0, explanatory text, no extra edit-store button and unfiltered all target', async () => {
    fetchMatches.mockResolvedValue({ hasStore: true, storeField: null, rows: [] });
    view();
    await screen.findByText(dashboard.matches.none);
    expect(screen.getByText(/AI gợi ý.*0 nhu cầu/)).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Cập nhật gian hàng' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: dashboard.matches.all }));
    expect(push).toHaveBeenCalledWith('/needs');
  });
  it('loading has a skeleton; network error retries without blocking dashboard', async () => {
    fetchMatches.mockRejectedValueOnce(new Error('network'));
    view();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: dashboard.matches.retry }));
    await screen.findByText('Robusta need');
    expect(fetchMatches).toHaveBeenCalledTimes(2);
  });
  it('loading skeleton exposes busy state', () => {
    fetchMatches.mockImplementation(() => new Promise(() => undefined));
    const r = view();
    expect(r.container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });
  it.each([401, 402, 403])('access error%s silently hides card', async (status) => {
    fetchMatches.mockRejectedValue(new ApiError('FORBIDDEN', status, 'denied'));
    const r = view();
    await waitFor(() => expect(fetchMatches).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(r.container.innerHTML).toBe(''));
  });
  it('user-scoped cache does not expose another account rows', async () => {
    const r = view();
    await screen.findByText('Robusta need');
    me = { id: 'other-business', accountType: 'business' };
    fetchMatches.mockImplementation(() => new Promise(() => undefined));
    r.rerender(
      <QueryClientProvider client={client}>
        <NextIntlClientProvider locale="vi" messages={{ dashboard, needs }}>
          <NeedMatchesCard />
        </NextIntlClientProvider>
      </QueryClientProvider>,
    );
    expect(screen.queryByText('Robusta need')).toBeNull();
  });
});
