import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import * as api from '../bulk-api';
import { BULK_ID, ITEM_ID, bulkFixture, bulkItem } from '../tests/bulk-fixture';
import { botTestContext } from '../tests/context';
import { useBotBulk } from './use-bot-bulk';

vi.mock('../bulk-api', async (original) => ({
  ...(await original<typeof api>()),
  fetchLatestBotBulk: vi.fn(),
  fetchBotBulkItems: vi.fn(),
}));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.fetchLatestBotBulk).mockResolvedValue({ batch: null });
  vi.mocked(api.fetchBotBulkItems).mockResolvedValue({ items: [], nextCursor: null });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
function mount() {
  const context = botTestContext();
  return { ...renderHook(useBotBulk, context), ...context };
}
it('D-112 empty recovery does not issue an invalid item read or invent a draft', async () => {
  const { result } = mount();
  await waitFor(() => expect(result.current.latest.isSuccess).toBe(true));
  expect(result.current.batch).toBeNull();
  expect(result.current.results).toEqual([]);
  expect(api.fetchBotBulkItems).not.toHaveBeenCalled();
});
it('D-112 recovers persisted ready results/selection and reads every ordinal page', async () => {
  vi.mocked(api.fetchLatestBotBulk).mockResolvedValue({
    batch: bulkFixture({ status: 'done', cursor: 2 }),
  });
  const first = bulkItem({ selected: false });
  const second = bulkItem({ id: BULK_ID, ordinal: 1, savedScriptId: 'saved1' });
  vi.mocked(api.fetchBotBulkItems).mockImplementation((_id, after) =>
    Promise.resolve(
      after === -1 ? { items: [first], nextCursor: 0 } : { items: [second], nextCursor: null },
    ),
  );
  const { result } = mount();
  await waitFor(() => expect(result.current.results).toEqual([first]));
  await act(async () => {
    await result.current.items.fetchNextPage();
  });
  await waitFor(() => expect(result.current.results).toEqual([first, second]));
  expect(api.fetchBotBulkItems).toHaveBeenCalledWith(BULK_ID, 0);
  expect(result.current.items.hasNextPage).toBe(false);
});
it('D-112 polls running work and refreshes the final ready item when generation completes', async () => {
  vi.useFakeTimers();
  vi.mocked(api.fetchLatestBotBulk)
    .mockResolvedValueOnce({ batch: bulkFixture() })
    .mockResolvedValue({ batch: bulkFixture({ status: 'done', cursor: 2 }) });
  vi.mocked(api.fetchBotBulkItems).mockImplementation(() =>
    Promise.resolve(
      vi.mocked(api.fetchLatestBotBulk).mock.calls.length > 1
        ? { items: [bulkItem()], nextCursor: null }
        : { items: [], nextCursor: null },
    ),
  );
  const { result } = mount();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10);
  });
  expect(result.current.batch?.status).toBe('running');
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2010);
  });
  expect(result.current.batch?.status).toBe('done');
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10);
  });
  expect(result.current.results).toEqual([bulkItem()]);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(4000);
  });
  expect(api.fetchLatestBotBulk).toHaveBeenCalledTimes(2);
});
it('D-112 failed batch retains partial results and exposes read errors for explicit recovery', async () => {
  vi.mocked(api.fetchLatestBotBulk).mockResolvedValue({
    batch: bulkFixture({ status: 'failed', cursor: 1, error: 'provider' }),
  });
  vi.mocked(api.fetchBotBulkItems).mockRejectedValueOnce(new Error('offline'));
  const { result } = mount();
  await waitFor(() => expect(result.current.items.isError).toBe(true));
  expect(result.current.batch?.error).toBe('provider');
  vi.mocked(api.fetchBotBulkItems).mockResolvedValue({ items: [bulkItem()], nextCursor: null });
  await act(async () => {
    await result.current.items.refetch();
  });
  await waitFor(() => expect(result.current.results).toEqual([bulkItem()]));
});
it('D-112 new latest identity cannot display items cached for the preceding batch', async () => {
  vi.mocked(api.fetchLatestBotBulk).mockResolvedValue({ batch: bulkFixture({ status: 'done' }) });
  vi.mocked(api.fetchBotBulkItems).mockImplementation((id) =>
    Promise.resolve({
      items: id === BULK_ID ? [bulkItem()] : [],
      nextCursor: null,
    }),
  );
  const { result, client } = mount();
  await waitFor(() => expect(result.current.results).toHaveLength(1));
  act(() => {
    client.setQueryData(api.botBulkKeys.latest(), {
      batch: bulkFixture({ id: ITEM_ID, status: 'done' }),
    });
  });
  await waitFor(() => expect(result.current.batch?.id).toBe(ITEM_ID));
  expect(result.current.results).toEqual([]);
});
