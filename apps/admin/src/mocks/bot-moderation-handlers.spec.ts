import { setupServer } from 'msw/node';
import { reportSchema } from '@opchub/shared/api-domains';
import { botState, mockDb, resetMockDb } from '@opchub/shared/mock-domains';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;
const headers = { Authorization: 'Bearer mock.admin', 'Content-Type': 'application/json' };
const send = (path: string, method: string, body?: unknown) =>
  fetch(`${BASE}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T05:00:00Z'));
  resetMockDb();
  const db = mockDb();
  db.messages.clear();
  db.botMessageMeta.clear();
  db.reports = [];
  botState().threads = [];
  for (const persona of db.personas) persona.enabled = false;
  const persona = db.personas[0];
  const script = db.scripts[0];
  if (!persona || !script) throw new Error('Missing bot fixture');
  persona.enabled = true;
  persona.activeHours = '00:00 - 24:00';
  persona.groupIds = ['c1'];
  persona.postsPerDay = 20;
  script.enabled = true;
  script.groupIds = ['c1'];
  script.lines = [{ personaId: persona.id, body: 'Cần VAY NÓNG' }];
});
afterEach(() => vi.useRealTimers());
afterAll(() => server.close());

async function run() {
  const script = mockDb().scripts[0];
  if (!script) throw new Error('Missing script');
  expect((await send(`/admin/scripts/${script.id}/run`, 'POST')).status).toBe(202);
  expect((await fetch(`${BASE}/admin/bot/threads`, { headers })).status).toBe(200);
}
async function reports() {
  const response = await fetch(`${BASE}/admin/reports?source=auto&status=open&size=100`, {
    headers,
  });
  expect(response.status).toBe(200);
  const page = (await response.json()) as { items: unknown[]; total: number };
  return { items: page.items.map((row) => reportSchema.parse(row)), total: page.total };
}

describe('NA-07 UAT-15 MSW persona publication -> Admin automatic queue', () => {
  it('actual script run creates a single zero-reporter auto case while preserving original chat content', async () => {
    await run();
    expect(mockDb().reports).toHaveLength(0);
    const first = await reports();
    expect(first.total).toBe(1);
    expect(first.items[0]).toMatchObject({
      source: 'auto',
      status: 'open',
      reporterCount: 0,
      hit: 'VAY NÓNG',
      reason: 'scam',
      body: 'Cần VAY NÓNG',
    });
    expect((await reports()).items.map((row) => row.id)).toEqual(first.items.map((row) => row.id));
    const message = mockDb().messages.get('c1-general')?.[0];
    expect(message?.body).toBe('Cần VAY NÓNG');
    expect(message?.hiddenAt).toBeUndefined();
  });

  it('keyword API updates affect future posts but do not rewrite hits already captured for pending jobs', async () => {
    const script = mockDb().scripts[0];
    if (!script) throw new Error('Missing script');
    script.lines[0]!.body = 'CUSTOMFLAG';
    expect((await send('/admin/moderation/keywords', 'POST', { word: 'customflag' })).status).toBe(
      201,
    );
    await run();
    expect((await send('/admin/moderation/keywords/customflag', 'DELETE')).status).toBe(200);
    const first = await reports();
    expect(first.total).toBe(1);
    expect(first.items[0]).toMatchObject({ hit: 'CUSTOMFLAG', reason: 'other', reporterCount: 0 });
    await run();
    expect((await reports()).items.map((row) => row.id)).toEqual(first.items.map((row) => row.id));
    expect(mockDb().messages.get('c1-general')).toHaveLength(2);
  });
});
