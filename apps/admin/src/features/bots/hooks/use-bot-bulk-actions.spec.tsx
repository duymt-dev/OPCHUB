import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { ApiError } from '@/lib/api-client';
import { useCan } from '@/lib/permissions';
import { botKeys } from '../api';
import * as api from '../bulk-api';
import { BULK_ID, ITEM_ID, bulkFixture, bulkInput } from '../tests/bulk-fixture';
import { botTestContext } from '../tests/context';
import { useBotBulkActions } from './use-bot-bulk-actions';

vi.mock('@/lib/permissions', () => ({ useCan: vi.fn() }));
vi.mock('../bulk-api', async (original) => ({
  ...(await original<typeof api>()),
  createBotBulk: vi.fn(),
  retryBotBulk: vi.fn(),
  saveBotBulk: vi.fn(),
  selectBotBulkItems: vi.fn(),
}));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useCan).mockReturnValue(true);
  vi.mocked(api.createBotBulk).mockResolvedValue(bulkFixture());
  vi.mocked(api.retryBotBulk).mockResolvedValue(bulkFixture());
  vi.mocked(api.selectBotBulkItems).mockResolvedValue(bulkFixture({ selectedCount: 1 }));
  vi.mocked(api.saveBotBulk).mockResolvedValue({ saved: 1, scriptIds: ['script1'] });
});
afterEach(cleanup);
function mount() {
  const context = botTestContext();
  return { ...renderHook(useBotBulkActions, context), ...context };
}
it('D-112 preserves same-intent request UUID after an uncertain error and prevents concurrent writes', async () => {
  const { result, client } = mount();
  let reject!: (error: Error) => void;
  vi.mocked(api.createBotBulk).mockReturnValueOnce(
    new Promise((_, fail) => {
      reject = fail;
    }),
  );
  act(() => {
    void result.current.create(bulkInput());
    void result.current.create(bulkInput());
    void result.current.save(BULK_ID);
  });
  await waitFor(() => expect(api.createBotBulk).toHaveBeenCalledTimes(1));
  expect(api.saveBotBulk).not.toHaveBeenCalled();
  expect(client.getQueryData(api.botBulkKeys.latest())).toBeUndefined();
  const first = vi.mocked(api.createBotBulk).mock.calls[0]?.[0];
  act(() => reject(new Error('Connection lost after admission')));
  await waitFor(() => expect(result.current.error?.message).toMatch('Connection lost'));
  await act(async () => {
    expect(await result.current.create(bulkInput())).toBe(true);
  });
  expect(api.createBotBulk).toHaveBeenLastCalledWith(first);
  expect(client.getQueryData(api.botBulkKeys.latest())).toEqual({ batch: bulkFixture() });
  await act(async () => {
    await result.current.create(bulkInput());
  });
  expect(vi.mocked(api.createBotBulk).mock.calls[2]?.[0].requestId).not.toBe(first?.requestId);
  expect(api.saveBotBulk).not.toHaveBeenCalled();
});
it('D-112 retains server field errors and recovers only on explicit retry', async () => {
  const { result } = mount();
  const failure = new ApiError('VALIDATION_ERROR', 400, 'Invalid groups', [
    { path: 'groupIds', message: 'Unavailable' },
  ]);
  vi.mocked(api.createBotBulk).mockRejectedValueOnce(failure);
  await act(async () => {
    expect(await result.current.create(bulkInput())).toBe(false);
  });
  await waitFor(() => expect(result.current.error).toBe(failure));
  expect(api.createBotBulk).toHaveBeenCalledTimes(1);
  await act(async () => {
    await result.current.retry(BULK_ID);
  });
  expect(api.retryBotBulk).toHaveBeenCalledWith(BULK_ID);
});
it('D-112 selection/save invalidate canonical draft, items and saved script list without optimistic markers', async () => {
  const { result, client } = mount();
  client.setQueryData(api.botBulkKeys.latest(), { batch: bulkFixture() });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  await act(async () => {
    await result.current.select(BULK_ID, { itemIds: [ITEM_ID], selected: true });
  });
  expect(client.getQueryData(api.botBulkKeys.latest())).toEqual({
    batch: bulkFixture({ selectedCount: 1 }),
  });
  await act(async () => {
    await result.current.save(BULK_ID);
  });
  for (const key of [
    api.botBulkKeys.latest(),
    api.botBulkKeys.items(BULK_ID),
    botKeys.scripts(),
    botKeys.activity(),
  ])
    expect(invalidate).toHaveBeenCalledWith({ queryKey: key });
  expect(api.saveBotBulk).toHaveBeenCalledTimes(1);
  expect(client.getQueryData(api.botBulkKeys.latest())).toEqual({
    batch: bulkFixture({ selectedCount: 1 }),
  });
});
it('D-112 an old batch selection response cannot replace a newer recovered draft', async () => {
  const { result, client } = mount();
  const newer = bulkFixture({ id: ITEM_ID });
  client.setQueryData(api.botBulkKeys.latest(), { batch: newer });
  await act(async () => {
    await result.current.select(BULK_ID, { itemIds: [ITEM_ID], selected: true });
  });
  expect(client.getQueryData(api.botBulkKeys.latest())).toEqual({ batch: newer });
});
it('D-112 read-only callbacks cannot create, select, retry or save', async () => {
  vi.mocked(useCan).mockReturnValue(false);
  const { result } = mount();
  await act(async () => {
    expect(await result.current.create(bulkInput())).toBe(false);
    expect(await result.current.select(BULK_ID, { itemIds: [ITEM_ID], selected: false })).toBe(
      false,
    );
    expect(await result.current.retry(BULK_ID)).toBe(false);
    expect(await result.current.save(BULK_ID)).toBe(false);
  });
  for (const method of [
    api.createBotBulk,
    api.selectBotBulkItems,
    api.retryBotBulk,
    api.saveBotBulk,
  ])
    expect(method).not.toHaveBeenCalled();
});
