import { setupServer } from 'msw/node';
import {
  botConversationTypeSchema,
  botConversationTypesPageSchema,
} from '@opchub/shared/api-domains';
import { auditLog, botState, mockDb } from '@opchub/shared/mock-domains';
import { handlers } from './handlers';
import { botContractFixture, botRequest } from './tests/bot-contract.fixture';

const server = setupServer(...handlers);
const base = '/admin/bot/conversation-types';
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterAll(() => server.close());
beforeEach(() => botContractFixture());

it('returns four immutable builtins, creates/paginates/deletes custom definitions with actual audits', async () => {
  const first = await botRequest(base);
  expect(first.status).toBe(200);
  const initial = botConversationTypesPageSchema.parse(await first.json());
  expect(initial).toMatchObject({ items: [], nextCursor: null });
  expect(initial.builtins).toHaveLength(4);
  expect(initial.builtins.find((type) => type.id === 'builtin-qa')).toMatchObject({
    custom: false,
  });
  const saved = [];
  for (const name of ['Phỏng vấn', 'Tranh luận']) {
    const response = await botRequest(base, 'POST', { name, description: 'Nội dung hướng dẫn' });
    expect(response.status).toBe(201);
    saved.push(botConversationTypeSchema.parse(await response.json()));
  }
  saved.sort((a, b) => a.id.localeCompare(b.id));
  const page = botConversationTypesPageSchema.parse(
    await (await botRequest(`${base}?limit=1`)).json(),
  );
  expect(page.items).toEqual(saved.slice(0, 1));
  expect(page.nextCursor).toBe(saved[0]?.id);
  const next = botConversationTypesPageSchema.parse(
    await (await botRequest(`${base}?limit=1&after=${page.nextCursor}`)).json(),
  );
  expect(next.items).toEqual(saved.slice(1));
  const custom = saved[0];
  if (!custom) throw new Error('Missing custom definition');
  const script = mockDb().scripts[0];
  if (!script) throw new Error('Missing script');
  script.type = custom.name;
  const deleting = await botRequest(`${base}/${custom.id}`, 'DELETE');
  expect(deleting.status).toBe(200);
  expect(await deleting.json()).toEqual({ id: custom.id });
  expect(script.type).toBe(custom.name);
  expect(botState().audit.map((a) => a.action)).toEqual([
    'bot.conversation_type.delete',
    'bot.conversation_type.create',
    'bot.conversation_type.create',
  ]);
  expect(auditLog().filter((a) => a.action.startsWith('bot.conversation_type.'))).toHaveLength(3);
});

it('rejects duplicates, builtin removal and malformed queries/bodies before any successful-write audit', async () => {
  for (const body of [{ name: '' }, { name: 'Valid', extra: true }, { description: '' }])
    expect((await botRequest(base, 'POST', body)).status).toBe(400);
  expect((await botRequest(base, 'POST', { name: 'hỎi ĐáP' })).status).toBe(409);
  expect((await botRequest(`${base}/builtin-qa`, 'DELETE')).status).toBe(409);
  expect((await botRequest(`${base}/missing`, 'DELETE')).status).toBe(404);
  for (const query of ['limit=0', 'limit=101', 'limit=1&limit=2', 'after=not-a-uuid'])
    expect((await botRequest(`${base}?${query}`)).status).toBe(400);
  expect(botState().conversationTypes).toEqual([]);
  expect(botState().audit).toEqual([]);
});

it('checks authentication and bots permissions before reads/writes and never mutates on denial', async () => {
  for (const [actor, status] of [
    ['', 401],
    ['m1', 401],
    ['adm-mai', 403],
  ] as const) {
    expect((await botRequest(base, 'POST', { name: 'Denied' }, actor)).status).toBe(status);
    expect((await botRequest(`${base}/builtin-qa`, 'DELETE', undefined, actor)).status).toBe(
      status,
    );
  }
  expect((await botRequest(base, 'GET', undefined, '')).status).toBe(401);
  expect(botState().conversationTypes).toEqual([]);
  expect(botState().audit).toEqual([]);
});
