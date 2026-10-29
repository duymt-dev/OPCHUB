import { bulkInput, BULK_ID, ITEM_ID, TYPE_ID } from '../tests/bulk-fixture';
import { bulkRequestReplay } from './request-replay';

it('D-112 reuses the normalized input intent after uncertain failure, but not after success', () => {
  const uuid = vi.fn().mockReturnValueOnce(BULK_ID).mockReturnValueOnce(ITEM_ID);
  const replay = bulkRequestReplay(uuid);
  const first = replay.prepare({ ...bulkInput(), topics: [' AI ', 'ai', ''] });
  expect(replay.prepare(bulkInput())).toEqual(first);
  expect(uuid).toHaveBeenCalledTimes(1);
  replay.acknowledge(first.requestId);
  expect(replay.prepare(bulkInput()).requestId).toBe(ITEM_ID);
});
it('D-112 changed input is a new intent; a stale acknowledgement cannot clear it', () => {
  const uuid = vi
    .fn()
    .mockReturnValueOnce(BULK_ID)
    .mockReturnValueOnce(ITEM_ID)
    .mockReturnValueOnce(TYPE_ID);
  const replay = bulkRequestReplay(uuid);
  replay.prepare(bulkInput());
  const changed = { ...bulkInput(), turns: 8 };
  expect(replay.prepare(changed).requestId).toBe(ITEM_ID);
  replay.acknowledge(BULK_ID);
  expect(replay.prepare(changed).requestId).toBe(ITEM_ID);
  expect(replay.prepare(bulkInput()).requestId).toBe(TYPE_ID);
});
it('D-112 rejects invalid/oversized form values instead of truncating or consuming the pending intent', () => {
  const replay = bulkRequestReplay(() => BULK_ID);
  const first = replay.prepare(bulkInput());
  for (const patch of [
    { topics: [] },
    { topics: Array.from({ length: 101 }, (_, i) => `Topic ${i}`) },
    { turns: 9 },
    { delayMinutes: 61 },
    { groupIds: [] },
  ])
    expect(() => replay.prepare({ ...bulkInput(), ...patch })).toThrow();
  expect(replay.prepare(bulkInput())).toEqual(first);
});
