import { api } from '@/lib/api-client';
import * as bulk from './bulk-api';
import { BULK_ID, ITEM_ID, bulkInput, bulkFixture } from './tests/bulk-fixture';

vi.mock('@/lib/api-client', () => ({ api: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
it('D-112 sends strict normalized create input and validates the canonical batch response', async () => {
  vi.mocked(api).mockResolvedValue(bulkFixture());
  await bulk.createBotBulk({ ...bulkInput(), requestId: ITEM_ID, topics: [' AI ', 'ai'] });
  expect(api).toHaveBeenCalledWith(
    '/admin/bot/bulk-scripts',
    expect.objectContaining({
      method: 'POST',
      body: { ...bulkInput(), requestId: ITEM_ID },
    }),
  );
  const options = vi.mocked(api).mock.calls[0]?.[1];
  expect(options?.schema.safeParse({ ...bulkFixture(), cursor: '2' }).success).toBe(false);
});
it('D-112 reads bounded ordinal pages and rejects invalid IDs/cursors before fetch', async () => {
  await bulk.fetchLatestBotBulk();
  await bulk.fetchBotBulkItems(BULK_ID);
  await bulk.fetchBotBulkItems(BULK_ID, 49);
  expect(api).toHaveBeenNthCalledWith(1, '/admin/bot/bulk-scripts/latest', expect.any(Object));
  expect(api).toHaveBeenNthCalledWith(
    2,
    `/admin/bot/bulk-scripts/${BULK_ID}/items?after=-1&limit=50`,
    expect.any(Object),
  );
  expect(api).toHaveBeenNthCalledWith(
    3,
    `/admin/bot/bulk-scripts/${BULK_ID}/items?after=49&limit=50`,
    expect.any(Object),
  );
  expect(() => bulk.fetchBotBulkItems('../latest')).toThrow();
  expect(() => bulk.fetchBotBulkItems(BULK_ID, 500)).toThrow();
  expect(api).toHaveBeenCalledTimes(3);
});
it('D-112 selection/retry/save remain separate explicit commands with shared response schemas', async () => {
  await bulk.selectBotBulkItems(BULK_ID, { itemIds: [ITEM_ID, ITEM_ID], selected: false });
  await bulk.retryBotBulk(BULK_ID);
  await bulk.saveBotBulk(BULK_ID);
  expect(api).toHaveBeenNthCalledWith(
    1,
    `/admin/bot/bulk-scripts/${BULK_ID}/selection`,
    expect.objectContaining({
      method: 'PATCH',
      body: { itemIds: [ITEM_ID], selected: false },
    }),
  );
  for (const [index, path] of [
    [2, 'retry'],
    [3, 'save'],
  ] as const)
    expect(api).toHaveBeenNthCalledWith(
      index,
      `/admin/bot/bulk-scripts/${BULK_ID}/${path}`,
      expect.objectContaining({ method: 'POST', body: {} }),
    );
  expect(() => bulk.selectBotBulkItems(BULK_ID, { itemIds: [], selected: false })).toThrow();
});
