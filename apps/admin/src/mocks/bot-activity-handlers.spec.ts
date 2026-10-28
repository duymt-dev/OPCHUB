import { setupServer } from 'msw/node';
import { z } from 'zod';
import { botActivitySchema } from '@opchub/shared/api-domains';
import { botState, mockDb, resetMockDb } from '@opchub/shared/mock-domains';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const NOW = Date.parse('2026-10-21T16:59:59Z');
const headers = { Authorization: 'Bearer mock.admin', 'Content-Type': 'application/json' };
const send = (path: string, method = 'GET', body?: unknown) =>
  fetch(`${location.origin}/v1/admin${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const activity = async () => {
  const response = await send('/bot/activity');
  expect(response.status).toBe(200);
  return z
    .object({ items: botActivitySchema.array(), todayCount: z.number().int() })
    .parse(await response.json());
};
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  resetMockDb();
  const db = mockDb();
  const persona = db.personas[0];
  const script = db.scripts[0];
  if (!persona || !script) throw new Error('Missing bot catalog');
  persona.enabled = true;
  persona.activeHours = '00:00 - 24:00';
  persona.groupIds = ['c1', 'c2'];
  persona.postsPerDay = 20;
  db.botSettings.enabled = true;
  db.botSettings.autoGenerate = false;
  db.botSettings.replyToMembers = false;
  db.scripts = [
    {
      ...script,
      id: 'http-count',
      topic: 'HTTP counting',
      enabled: true,
      runAt: null,
      groupIds: ['c1'],
      delayMinutes: 1,
      lines: [{ personaId: persona.id, body: 'HTTP publication' }],
    },
  ];
  db.botLog = [];
  botState().threads = [];
});
afterEach(() => vi.useRealTimers());
afterAll(() => server.close());

describe('TIP-V2-515 REQ-208 UAT-15 Admin day counts and posting gate', () => {
  it('actual run/activity/settings endpoints reset today count at VN midnight while preserving history', async () => {
    expect((await send('/scripts/http-count/run', 'POST')).status).toBe(202);
    const first = await activity();
    expect(first.todayCount).toBe(1);
    expect(first.items[0]?.text).toBe('Đã đăng lượt 1/1: HTTP counting');
    expect((await send('/bot/settings', 'PATCH', { enabled: false })).status).toBe(200);
    vi.setSystemTime(NOW + 2000);
    const next = await activity();
    expect(next.todayCount).toBe(0);
    expect(next.items).toEqual(first.items);
    expect(botState().audit.map((row) => row.action)).toEqual([
      'bot_settings.update',
      'script.run',
    ]);
  });

  it('a blocked destination leaves the whole turn pending; HTTP polling publishes it once after rate expiry', async () => {
    const script = mockDb().scripts[0];
    if (!script) throw new Error('Missing script');
    script.groupIds = ['c1', 'c2'];
    botState().groupRate.set('c2', Array<number>(30).fill(NOW));
    expect((await send('/scripts/http-count/run', 'POST')).status).toBe(202);
    expect(await activity()).toEqual({ items: [], todayCount: 0 });
    expect(botState().threads[0]).toMatchObject({ cursor: 0, status: 'scheduled' });
    vi.setSystemTime(NOW + 60000);
    expect((await activity()).todayCount).toBe(2);
    expect((await activity()).todayCount).toBe(2);
    expect(botState().threads[0]).toMatchObject({ cursor: 1, status: 'done' });
    expect(botState().audit.map((row) => row.action)).toEqual(['script.run']);
  });
});
