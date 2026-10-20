import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api';
import { affiliateTestContext } from '../tests/context';
import { useAffiliateCounts } from './use-affiliate-counts';

vi.mock('../api', async (original) => ({
  ...(await original<typeof api>()),
  fetchCommissions: vi.fn(),
  fetchAffiliates: vi.fn(),
}));
beforeEach(() => {
  vi.clearAllMocks();
  const empty = { items: [], page: 1, size: 1 };
  vi.mocked(api.fetchAffiliates).mockResolvedValue({ ...empty, total: 62 });
  vi.mocked(api.fetchCommissions).mockImplementation(({ status }) =>
    Promise.resolve({
      ...empty,
      total: { all: 51, recorded: 19, paid: 31, cancelled: 1 }[status],
    }),
  );
});
afterEach(cleanup);

describe('REQ-312 server status totals back statistics and filter badges', () => {
  it('uses unfiltered totals despite empty item pages, excluding cancelled from conversion count', async () => {
    const { result } = renderHook(() => useAffiliateCounts(true), affiliateTestContext());
    await waitFor(() => expect(result.current.customers).toBe(50));
    expect(result.current.statuses).toEqual({ all: 51, recorded: 19, paid: 31, cancelled: 1 });
    for (const status of ['all', 'recorded', 'paid', 'cancelled']) {
      expect(api.fetchCommissions).toHaveBeenCalledWith({ page: 1, size: 1, status });
    }
    expect(result.current.aff).toBe(62);
  });
  it('does not invent zero or a conversion count when a required status total fails', async () => {
    vi.mocked(api.fetchCommissions).mockImplementation(({ status }) => {
      if (status === 'paid') return Promise.reject(new Error('Unavailable'));
      return Promise.resolve({ items: [], page: 1, size: 1, total: 1 });
    });
    const { result } = renderHook(() => useAffiliateCounts(true), affiliateTestContext());
    await waitFor(() => expect(result.current.statuses.recorded).toBe(1));
    expect(result.current.statuses.paid).toBeUndefined();
    expect(result.current.customers).toBeUndefined();
  });
  it('does not request any totals without view permission', () => {
    renderHook(() => useAffiliateCounts(false), affiliateTestContext());
    expect(api.fetchCommissions).not.toHaveBeenCalled();
    expect(api.fetchAffiliates).not.toHaveBeenCalled();
  });
});
