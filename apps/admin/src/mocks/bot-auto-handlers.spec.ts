import { botSettingsSchema, botThreadListSchema } from '@opchub/shared/api-domains';
import { botState, mockDb, resetMockDb } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const base = `${location.origin}/v1/admin/bot`;
const headers = { Authorization: 'Bearer mock.admin' };

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T05:00:00Z'));
  resetMockDb();
  const db = mockDb();
  db.scripts = [];
  db.botLog = [];
  db.messages.clear();
  db.botMessageMeta.clear();
  db.personas = db.personas.slice(0, 2);
  for (const p of db.personas) {
    p.enabled = true;
    p.activeHours = '00:00 - 24:00';
    p.groupIds = ['c1'];
    p.postsPerDay = 20;
  }
  botState().threads = [];
  document.cookie = 'opchub-mock-bot-manual=; Max-Age=0; Path=/';
});
afterEach(() => {
  document.cookie = 'opchub-mock-bot-manual=; Max-Age=0; Path=/';
  vi.useRealTimers();
});
afterAll(() => server.close());

it('REQ-208 default automatic flag has real HTTP effects without a script/run request', async () => {
  expect(mockDb().botSettings.autoGenerate).toBe(true);
  const response = await fetch(`${base}/threads`, { headers });
  expect(response.status).toBe(200);
  const { items } = botThreadListSchema.parse(await response.json());
  expect(items).toHaveLength(1);
  expect(items[0]).toMatchObject({ scriptId: null, kind: 'auto', isAuto: true, cursor: 1 });
  expect(items[0]?.lines).toHaveLength(3);
  expect(botState().audit).toEqual([]);
});

it('REQ-208 manual-only cookie seeds once, then permits explicit UI/API enable and generation', async () => {
  document.cookie = 'opchub-mock-bot-manual=1; Path=/';
  const first = await fetch(`${base}/threads`, { headers });
  expect(botThreadListSchema.parse(await first.json()).items).toEqual([]);
  expect(mockDb().botSettings.autoGenerate).toBe(false);
  const enabled = await fetch(`${base}/settings`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ autoGenerate: true }),
  });
  expect(enabled.status).toBe(200);
  expect(botSettingsSchema.parse(await enabled.json()).autoGenerate).toBe(true);
  const next = await fetch(`${base}/threads`, { headers });
  expect(botThreadListSchema.parse(await next.json()).items).toHaveLength(1);
  expect(botState().audit[0]?.action).toBe('bot_settings.update');
});

it.each([
  ['m1', 401],
  ['adm-mai', 403],
] as const)('REQ-208 denied actor %s does not execute the mock worker', async (actor, status) => {
  const response = await fetch(`${base}/threads`, {
    headers: { Authorization: `Bearer mock.${actor}` },
  });
  expect(response.status).toBe(status);
  expect(botState().threads).toEqual([]);
  expect(mockDb().botMessageMeta.size).toBe(0);
});
