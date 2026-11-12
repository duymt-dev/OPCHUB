import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type * as Ui from '@opchub/ui';
import { domainContext } from '@/i18n/tests/domain-context';
import { ApiError } from '@/lib/api-client';
import * as api from '../api';
import { usePriceConfig } from './use-price-config';

const state = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock('@opchub/ui', async (original) => ({
  ...(await original<typeof Ui>()),
  useToast: () => state.toast,
}));
vi.mock('../api', async (original) => ({
  ...(await original<typeof api>()),
  fetchPriceConfig: vi.fn(),
  savePriceConfig: vi.fn(),
}));
const value = {
  per: { list: 100000, y: 1200000 },
  biz: { list: 300000, y: 3600000 },
  fund: { p: 15000000, r: 10000000, mo: 12 },
  version: 3,
  updatedAt: '2026-11-11T00:00:00Z',
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.fetchPriceConfig).mockResolvedValue(value);
});
afterEach(cleanup);

it('AC824-10 price bounds use the current locale without changing integer draft values or saving', async () => {
  const c = domainContext();
  const h = renderHook(usePriceConfig, c);
  await waitFor(() => expect(h.result.current.form).not.toBeNull());
  act(() => h.result.current.set('per', 'y', '10000000001'));
  act(() => h.result.current.save());
  expect(state.toast).toHaveBeenLastCalledWith('Giá trị tối đa 10.000.000.000');
  c.current.locale = 'en';
  h.rerender();
  act(() => h.result.current.save());
  expect(state.toast).toHaveBeenLastCalledWith('Maximum value: 10,000,000,000');
  expect(h.result.current.form?.per.y).toBe(10000000001);
  expect(api.savePriceConfig).not.toHaveBeenCalled();
  act(() => h.result.current.set('per', 'y', '1,234,567'));
  expect(h.result.current.form?.per.y).toBe(1234567);
});
it('AC824-12 valid price payload retains version and raw API failures', async () => {
  vi.mocked(api.savePriceConfig).mockRejectedValue(
    new ApiError('CONFLICT', 409, 'Giá trị tối đa 365'),
  );
  const c = domainContext();
  c.current.locale = 'en';
  const h = renderHook(usePriceConfig, c);
  await waitFor(() => expect(h.result.current.form).not.toBeNull());
  act(() => h.result.current.set('fund', 'mo', '60'));
  act(() => h.result.current.save());
  await waitFor(() => expect(state.toast).toHaveBeenCalledWith('Giá trị tối đa 365'));
  expect(api.savePriceConfig).toHaveBeenCalledWith(
    { per: value.per, biz: value.biz, version: value.version, fund: { ...value.fund, mo: 60 } },
    expect.anything(),
  );
  expect(h.result.current.form?.fund.mo).toBe(60);
});
