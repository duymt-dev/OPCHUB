import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { DirectorRegion } from '../types';
import * as api from '../api-region';
import affiliate from '../../../../messages/vi/affiliate.json';
import { MyRegionAffiliates } from './my-region-affiliates';

const rows = Array.from({ length: 130 }, (_, i) => ({
  id: `r-${i}`,
  name: `Affiliate ${i}`,
  code: `A${i}`,
  province: 'Hà Nội',
  customers: 1,
  revenue: 100_000,
  share: 1000,
}));
const data: DirectorRegion = {
  state: 'director',
  region: 'north',
  label: 'Bắc',
  provinces: [],
  bank: null,
  kpi: { revenue: 0, count: 0, share: 0, paid: 0, paidMonths: 0, due: 0 },
  years: [],
  affiliates: rows.slice(0, 50),
  more: 80,
  months: [],
  payoutDate: '30/11/2026',
};
let client: QueryClient;
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function mount() {
  render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="vi" messages={{ affiliate }}>
        <MyRegionAffiliates data={data} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}
it('SPEC16 loads130 unique affiliate rows in50-row pages and exports only after a click', async () => {
  const fetch = vi
    .spyOn(api, 'fetchRegionAffiliates')
    .mockResolvedValueOnce({ items: rows.slice(50, 100), more: 30, nextCursor: 'next' })
    .mockResolvedValueOnce({ items: rows.slice(100), more: 0, nextCursor: null });
  const download = vi.spyOn(api, 'downloadRegionAffiliates').mockResolvedValue();
  mount();
  expect(screen.getAllByRole('row')).toHaveLength(51);
  expect(fetch).not.toHaveBeenCalled();
  expect(download).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Xem thêm (80)' }));
  await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(101));
  fireEvent.click(screen.getByRole('button', { name: 'Xem thêm (30)' }));
  await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(131));
  expect(screen.queryByRole('button', { name: /Xem thêm/ })).toBeNull();
  expect(screen.getAllByText('Affiliate 129')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Tải CSV' }));
  await waitFor(() => expect(download).toHaveBeenCalledTimes(1));
});
it('SPEC16 failed next page preserves all visible rows and allows retry without silently dropping assertions', async () => {
  vi.spyOn(api, 'fetchRegionAffiliates')
    .mockRejectedValueOnce(new Error('unavailable'))
    .mockResolvedValueOnce({ items: rows.slice(50, 100), more: 30, nextCursor: 'last' });
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Xem thêm (80)' }));
  await screen.findByRole('alert');
  expect(screen.getAllByRole('row')).toHaveLength(51);
  fireEvent.click(screen.getByRole('button', { name: 'Xem thêm (80)' }));
  await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(101));
});
