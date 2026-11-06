import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GlobalSearchResult } from '@opchub/shared/api-domains';
import { ApiError } from '@/lib/api-client';
import { fetchGlobalSearch } from '../api';
import { useGlobalSearch } from './use-global-search';

vi.mock('../api', () => ({ fetchGlobalSearch: vi.fn() }));
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (select: (state: { me: { id: string } }) => unknown) =>
    select({ me: { id: 'viewer' } }),
}));
const fetchSearch = vi.mocked(fetchGlobalSearch);
let client: QueryClient;
function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
const tick = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};
const data = (title: string): GlobalSearchResult => ({
  groups: [{ kind: 'store', items: [{ id: title, title, sub: '' }] }],
});
beforeEach(() => {
  vi.useFakeTimers();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  fetchSearch.mockReset().mockResolvedValue(data('default'));
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.useRealTimers();
});
describe('BR-491 debounced query isolation', () => {
  it('waits 250ms, trims, ignores short terms and keeps previous results', async () => {
    const h = renderHook(useGlobalSearch, { wrapper: Wrapper });
    act(() => h.result.current.onQuery(' a '));
    await tick(500);
    expect(fetchSearch).not.toHaveBeenCalled();
    act(() => h.result.current.onQuery('  coffee  '));
    await tick(249);
    expect(fetchSearch).not.toHaveBeenCalled();
    await tick(2);
    await tick(1);
    expect(fetchSearch).toHaveBeenCalledWith('coffee');
    expect(h.result.current.groups).toEqual(data('default').groups);
    act(() => h.result.current.onQuery('tea'));
    expect(h.result.current.groups).toEqual(data('default').groups);
  });
  it('a late older response never replaces the newer query result', async () => {
    let finishOld: ((value: GlobalSearchResult) => void) | undefined;
    fetchSearch.mockImplementation((q) =>
      q === 'old'
        ? new Promise((resolve) => {
            finishOld = resolve;
          })
        : Promise.resolve(data('new')),
    );
    const h = renderHook(useGlobalSearch, { wrapper: Wrapper });
    act(() => h.result.current.onQuery('old'));
    await tick(251);
    await tick(1);
    act(() => h.result.current.onQuery('new'));
    await tick(251);
    await tick(1);
    expect(h.result.current.groups).toEqual(data('new').groups);
    act(() => finishOld?.(data('old')));
    await tick(1);
    expect(h.result.current.groups).toEqual(data('new').groups);
  });
  it.each([403, 500])('handles HTTP %s silently without losing the query', async (status) => {
    fetchSearch.mockRejectedValue(new ApiError('FORBIDDEN', status, 'error'));
    const h = renderHook(useGlobalSearch, { wrapper: Wrapper });
    act(() => h.result.current.onQuery('coffee'));
    await tick(251);
    await tick(1);
    expect(h.result.current.open).toBe(status !== 403);
    expect(h.result.current.groups).toEqual([]);
  });
});
