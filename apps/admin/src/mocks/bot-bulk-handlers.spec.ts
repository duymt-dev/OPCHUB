import { setupServer } from 'msw/node';
import {
  botBulkBatchSchema,
  botBulkItemsPageSchema,
  botBulkLatestSchema,
  botBulkSavedSchema,
} from '@opchub/shared/api-domains';
import { auditLog, botState, mockDb, resetMockDb } from '@opchub/shared/mock-domains';
import { handlers } from './handlers';
import { botContractFixture, botRequest } from './tests/bot-contract.fixture';

const server = setupServer(...handlers);
const base = '/admin/bot/bulk-scripts';
const input = () => ({
  requestId: crypto.randomUUID(),
  topics: ['Tìm khách hàng'],
  perTopic: 2,
  turns: 4,
  delayMinutes: 10,
  groupIds: ['c1'],
});
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterAll(() => server.close());
beforeEach(() => botContractFixture());

async function create(body = input()) {
  const response = await botRequest(base, 'POST', body);
  expect(response.status).toBe(202);
  return botBulkBatchSchema.parse(await response.json());
}
async function get(id: string) {
  const response = await botRequest(`${base}/${id}`);
  expect(response.status).toBe(200);
  return botBulkBatchSchema.parse(await response.json());
}

it('persists real HTTP progress, keyset results, selection and idempotent explicit save with audits', async () => {
  mockDb().botSettings.enabled = false;
  const body = input();
  const batch = await create(body);
  expect(batch).toMatchObject({ status: 'running', cursor: 0, total: 2 });
  expect((await create(body)).id).toBe(batch.id);
  expect(botState().audit.filter((a) => a.action === 'bot.bulk.create')).toHaveLength(1);
  expect(await get(batch.id)).toMatchObject({ cursor: 1, status: 'running' });
  const latest = botBulkLatestSchema.parse(await (await botRequest(`${base}/latest`)).json());
  expect(latest.batch).toMatchObject({ id: batch.id, cursor: 2, status: 'done' });
  const page = botBulkItemsPageSchema.parse(
    await (await botRequest(`${base}/${batch.id}/items?limit=1`)).json(),
  );
  expect(page.nextCursor).toBe(0);
  const item = page.items[0];
  if (!item) throw new Error('Missing item');
  const next = botBulkItemsPageSchema.parse(
    await (await botRequest(`${base}/${batch.id}/items?after=0&limit=1`)).json(),
  );
  expect(next.items).toHaveLength(1);
  expect(next.items[0]?.ordinal).toBe(1);
  expect(next.nextCursor).toBeNull();
  const selecting = await botRequest(`${base}/${batch.id}/selection`, 'PATCH', {
    itemIds: [item.id],
    selected: false,
  });
  expect(selecting.status).toBe(200);
  expect(botBulkBatchSchema.parse(await selecting.json()).selectedCount).toBe(1);
  const before = mockDb().scripts.length;
  const saving = await botRequest(`${base}/${batch.id}/save`, 'POST', {});
  expect(saving.status).toBe(200);
  const saved = botBulkSavedSchema.parse(await saving.json());
  expect(saved.saved).toBe(1);
  expect(mockDb().scripts).toHaveLength(before + 1);
  const replay = await botRequest(`${base}/${batch.id}/save`, 'POST', {});
  expect(botBulkSavedSchema.parse(await replay.json())).toEqual({ saved: 0, scriptIds: [] });
  expect(auditLog().filter((a) => a.action === 'script.create')).toHaveLength(1);
  expect(auditLog().filter((a) => a.action === 'bot.bulk.save')).toHaveLength(1);
  expect(auditLog().filter((a) => a.action === 'bot.bulk.item_generated')).toHaveLength(2);
  expect(await get(batch.id)).toMatchObject({ savedCount: 1, selectedCount: 1 });
});

it('keeps partial results through failure, requires explicit retry and never saves a running batch', async () => {
  const batch = await create();
  expect((await botRequest(`${base}/${batch.id}/save`, 'POST', {})).status).toBe(409);
  expect(await get(batch.id)).toMatchObject({ cursor: 1 });
  const enabled = mockDb().personas.map((p) => p.enabled);
  mockDb().personas.forEach((p) => {
    p.enabled = false;
  });
  expect(await get(batch.id)).toMatchObject({
    status: 'failed',
    error: 'personas_missing',
    cursor: 1,
  });
  mockDb().personas.forEach((p, i) => {
    p.enabled = enabled[i] ?? false;
  });
  expect(await get(batch.id)).toMatchObject({ status: 'failed', cursor: 1 });
  const retry = await botRequest(`${base}/${batch.id}/retry`, 'POST', {});
  expect(retry.status).toBe(202);
  expect(botBulkBatchSchema.parse(await retry.json())).toMatchObject({
    status: 'running',
    cursor: 1,
  });
  expect(await get(batch.id)).toMatchObject({ status: 'done', cursor: 2 });
  expect(botState().audit.filter((a) => a.action === 'bot.bulk.retry')).toHaveLength(1);
});

it('rejects malformed transport, oversized topics and nonexistent identities without mutation/audit', async () => {
  for (const body of [
    {},
    { ...input(), turns: 9 },
    { ...input(), extra: true },
    { ...input(), topics: Array.from({ length: 101 }, (_, i) => `Topic ${i}`) },
  ])
    expect((await botRequest(base, 'POST', body)).status).toBe(400);
  expect((await botRequest(base, 'POST', { ...input(), groupIds: ['missing'] })).status).toBe(400);
  const id = crypto.randomUUID();
  expect((await botRequest(`${base}/${id}`)).status).toBe(404);
  expect((await botRequest(`${base}/invalid`)).status).toBe(400);
  for (const query of ['after=500', 'after=0&after=1', 'limit=51'])
    expect((await botRequest(`${base}/${id}/items?${query}`)).status).toBe(400);
  expect((await botRequest(`${base}/${id}/retry`, 'POST', { unexpected: true })).status).toBe(400);
  expect((await botRequest(`${base}/${id}/save`, 'POST', {})).status).toBe(404);
  expect(botState().bulk).toEqual([]);
  expect(botState().audit).toEqual([]);
});

it('guards read/write permissions before parsing or advancing work and keeps latest actor-specific', async () => {
  const batch = await create();
  for (const [actor, status] of [
    ['', 401],
    ['m1', 401],
    ['adm-mai', 403],
  ] as const) {
    expect((await botRequest(base, 'POST', {}, actor)).status).toBe(status);
    expect((await botRequest(`${base}/${batch.id}/selection`, 'PATCH', {}, actor)).status).toBe(
      status,
    );
    for (const action of ['retry', 'save'])
      expect((await botRequest(`${base}/${batch.id}/${action}`, 'POST', {}, actor)).status).toBe(
        status,
      );
  }
  expect((await botRequest(`${base}/${batch.id}`, 'GET', undefined, '')).status).toBe(401);
  expect(botState().bulk[0]?.value.cursor).toBe(0);
  const editorLatest = await botRequest(`${base}/latest`, 'GET', undefined, 'adm-hang');
  expect(editorLatest.status).toBe(200);
  expect(botBulkLatestSchema.parse(await editorLatest.json())).toEqual({ batch: null });
  expect(botState().bulk).toHaveLength(1);
  resetMockDb();
});
