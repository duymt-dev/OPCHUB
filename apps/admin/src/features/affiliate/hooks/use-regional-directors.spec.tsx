import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { ApiError } from '@/lib/api-client';
import { useGrants } from '@/lib/permissions';
import * as api from '../regional-directors-api';
import { affiliateTestContext } from '../tests/context';
import { directorFixture } from '../tests/regional-directors';
import { useRegionalDirectors } from './use-regional-directors';

vi.mock('@/lib/permissions', () => ({ useGrants: vi.fn() }));
vi.mock('../regional-directors-api', async (original) => ({
  ...(await original<typeof api>()),
  fetchDirectors: vi.fn(),
  fetchDirectorHistory: vi.fn(),
  appointDirector: vi.fn(),
  updateDirector: vi.fn(),
  revokeDirector: vi.fn(),
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useGrants).mockReturnValue({
    keys: ['affiliate.view', 'affiliate.gdv'],
    roleName: 'Unrelated role name',
    previewing: false,
  });
  vi.mocked(api.fetchDirectors).mockResolvedValue(directorFixture());
  vi.mocked(api.fetchDirectorHistory).mockResolvedValue({ items: [], nextCursor: null });
  for (const fn of [api.appointDirector, api.updateDirector, api.revokeDirector])
    vi.mocked(fn).mockResolvedValue(directorFixture());
});
afterEach(cleanup);

it.each([false, true])(
  'REQ-616 missing write permission or preview blocks every director mutation (preview=%s)',
  async (previewing) => {
    vi.mocked(useGrants).mockReturnValue({
      keys: previewing ? ['affiliate.view', 'affiliate.gdv'] : ['affiliate.view'],
      roleName: 'View only',
      previewing,
    });
    const ctx = affiliateTestContext();
    const { result } = renderHook(useRegionalDirectors, ctx);
    await waitFor(() => expect(result.current.config.isSuccess).toBe(true));
    await act(async () => {
      expect(
        await result.current.write.mutateAsync({
          kind: 'appoint',
          body: { region: 'central', userId: 'candidate-two', version: 3 },
        }),
      ).toBeNull();
      expect(
        await result.current.write.mutateAsync({
          kind: 'save',
          region: 'north',
          body: { version: 3, provinces: [], bank: null },
        }),
      ).toBeNull();
      expect(
        await result.current.write.mutateAsync({ kind: 'revoke', region: 'north', version: 3 }),
      ).toBeNull();
    });
    expect(result.current.canManage).toBe(false);
    expect(api.appointDirector).not.toHaveBeenCalled();
    expect(api.updateDirector).not.toHaveBeenCalled();
    expect(api.revokeDirector).not.toHaveBeenCalled();
    ctx.client.clear();
  },
);

it('REQ-616 successful appointment uses the versioned API, commits server config and refreshes affected caches', async () => {
  const ctx = affiliateTestContext();
  const invalidate = vi.spyOn(ctx.client, 'invalidateQueries');
  const { result } = renderHook(useRegionalDirectors, ctx);
  await waitFor(() => expect(result.current.config.isSuccess).toBe(true));
  const next = directorFixture();
  next.slots[0] = {
    ...next.slots[0],
    region: 'north',
    version: 4,
    provinces: [],
    bank: null,
    incumbent: null,
    affiliateCount: 0,
  };
  vi.mocked(api.appointDirector).mockResolvedValue(next);
  const body = { region: 'central' as const, userId: 'candidate-two', version: 3 };
  await act(async () => {
    await result.current.write.mutateAsync({ kind: 'appoint', body });
  });
  expect(api.appointDirector).toHaveBeenCalledWith(body);
  expect(ctx.client.getQueryData(api.directorKeys.config)).toEqual(next);
  for (const key of [
    api.directorKeys.history,
    ['regional-directors', 'members'],
    ['admin-fees'],
    ['admin-members'],
  ])
    expect(invalidate).toHaveBeenCalledWith({ queryKey: key });
  ctx.client.clear();
});

it('REQ-616 stale version refetches authoritative config without an optimistic revoke', async () => {
  const ctx = affiliateTestContext();
  const { result } = renderHook(useRegionalDirectors, ctx);
  await waitFor(() => expect(result.current.config.isSuccess).toBe(true));
  vi.mocked(api.revokeDirector).mockRejectedValue(new ApiError('CONFLICT', 409, 'Stale version'));
  await act(async () => {
    await expect(
      result.current.write.mutateAsync({ kind: 'revoke', region: 'north', version: 2 }),
    ).rejects.toThrow('Stale version');
  });
  await waitFor(() => expect(api.fetchDirectors).toHaveBeenCalledTimes(2));
  expect(ctx.client.getQueryData(api.directorKeys.config)).toEqual(directorFixture());
  ctx.client.clear();
});

it('REQ-616 history follows both parts of the keyset cursor', async () => {
  const cursor = { at: '2026-10-01T00:00:00Z', id: '01900000-0000-7000-8000-000000000001' };
  vi.mocked(api.fetchDirectorHistory)
    .mockResolvedValueOnce({ items: [], nextCursor: cursor })
    .mockResolvedValue({ items: [], nextCursor: null });
  const ctx = affiliateTestContext();
  const { result } = renderHook(useRegionalDirectors, ctx);
  await waitFor(() => expect(result.current.history.hasNextPage).toBe(true));
  await act(async () => {
    await result.current.history.fetchNextPage();
  });
  expect(api.fetchDirectorHistory).toHaveBeenNthCalledWith(1, null);
  expect(api.fetchDirectorHistory).toHaveBeenNthCalledWith(2, cursor);
  ctx.client.clear();
});

it('REQ-616 no view permission never loads director config or history', () => {
  vi.mocked(useGrants).mockReturnValue({ keys: [], roleName: 'None', previewing: false });
  const ctx = affiliateTestContext();
  renderHook(useRegionalDirectors, ctx);
  expect(api.fetchDirectors).not.toHaveBeenCalled();
  expect(api.fetchDirectorHistory).not.toHaveBeenCalled();
  ctx.client.clear();
});
