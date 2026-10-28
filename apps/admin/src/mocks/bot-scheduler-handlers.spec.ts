import { setupServer } from 'msw/node';
import { z } from 'zod';
import { botThreadSchema } from '@opchub/shared/api-domains';
import { botState, mockDb, resetMockDb } from '@opchub/shared/mock-domains';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const NOW = Date.parse('2026-10-21T05:00:00Z');
const headers = { Authorization: 'Bearer mock.admin' };
const getThreads = async () => {
  const response = await fetch(`${location.origin}/v1/admin/bot/threads`, { headers });
  expect(response.status).toBe(200);
  return z.object({ items: botThreadSchema.array() }).parse(await response.json()).items;
};

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  resetMockDb();
  const db = mockDb();
  const script = db.scripts[0];
  const persona = db.personas[0];
  if (!script || !persona) throw new Error('Missing catalog fixture');
  persona.enabled = true;
  persona.groupIds = ['c1'];
  persona.activeHours = '00:00 - 24:00';
  persona.postsPerDay = 1000;
  db.scripts = [
    {
      ...script,
      id: 'http-due',
      enabled: true,
      runAt: new Date(NOW).toISOString(),
      groupIds: ['c1'],
      delayMinutes: 1,
      lines: [
        { personaId: persona.id, body: 'Scheduled HTTP opening' },
        { personaId: persona.id, body: 'Scheduled HTTP closing' },
      ],
    },
  ];
  db.botSettings.enabled = true;
  db.botSettings.autoGenerate = false;
  db.botLog = [];
  botState().threads = [];
});
afterEach(() => vi.useRealTimers());
afterAll(() => server.close());

describe('TIP-V2-501 UAT-15 LK-11 Admin MSW script worker HTTP', () => {
  it('poll admits due script, emits real turns at deadlines and never invents Admin run audit', async () => {
    const first = await getThreads();
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ scriptId: 'http-due', status: 'running', cursor: 1 });
    expect((await getThreads())[0]?.cursor).toBe(1);
    vi.setSystemTime(NOW + 59999);
    expect((await getThreads())[0]?.cursor).toBe(1);
    vi.setSystemTime(NOW + 60000);
    const done = await getThreads();
    expect(done[0]).toMatchObject({ id: first[0]?.id, status: 'done', cursor: 2 });
    expect(botState().audit).toEqual([]);
    const bodies = [...mockDb().messages.values()].flat().map((row) => row.body);
    expect(bodies.filter((body) => body === 'Scheduled HTTP opening')).toHaveLength(1);
    expect(bodies.filter((body) => body === 'Scheduled HTTP closing')).toHaveLength(1);
    vi.setSystemTime(NOW + 120000);
    expect(await getThreads()).toHaveLength(1);
  });

  it('actual run endpoint shares the same active thread as scheduler and records explicit commands only', async () => {
    const run = () =>
      fetch(`${location.origin}/v1/admin/scripts/http-due/run`, {
        method: 'POST',
        headers,
      });
    const first = await run();
    expect(first.status).toBe(202);
    const accepted = z
      .object({ threadId: z.string(), status: z.literal('scheduled') })
      .parse(await first.json());
    const replay = await run();
    expect(replay.status).toBe(202);
    expect(await replay.json()).toEqual(accepted);
    expect((await getThreads())[0]?.id).toBe(accepted.threadId);
    expect(botState().threads).toHaveLength(1);
    expect(botState().audit.map((row) => row.action)).toEqual(['script.run', 'script.run']);
  });
});
