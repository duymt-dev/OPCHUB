import { setupServer } from 'msw/node';
import { botState, mockDb, resetMockDb } from '@opchub/shared/mock-domains';
import { chatMessageSchema, dashboardLiveSchema } from '@opchub/shared/api-domains';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;
const headers = { Authorization: 'Bearer mock.m1', 'Content-Type': 'application/json' };
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T05:00:00Z'));
  resetMockDb();
  const db = mockDb();
  db.messages.clear();
  db.botMessageMeta.clear();
  botState().threads = [];
  for (const persona of db.personas) persona.enabled = false;
  const persona = db.personas[0];
  if (!persona) throw new Error('Missing persona');
  persona.enabled = true;
  persona.activeHours = '00:00 - 24:00';
  persona.groupIds = ['c1'];
  persona.postsPerDay = 20;
});
afterEach(() => vi.useRealTimers());
afterAll(() => server.close());

async function messages() {
  const response = await fetch(`${BASE}/rooms/c1-general/messages?size=50`, { headers });
  expect(response.status).toBe(200);
  const page = (await response.json()) as { items: unknown[] };
  return page.items.map((row) => chatMessageSchema.strict().parse(row));
}

describe('UAT-14 UAT-15 MSW Portal reply HTTP workflow', () => {
  it.each(['missing', 'cross-room'])(
    'P5-MSW-01 rejects %s reply targets before insert or bot admission',
    async (target) => {
      if (target === 'cross-room')
        mockDb().messages.set('c2-general', [
          {
            id: target,
            roomId: 'c2-general',
            body: 'Other room content',
            sender: { name: 'Other', avatarUrl: null },
            attachment: null,
            reactions: [],
            pinned: false,
            isSimulated: false,
            createdAt: new Date().toISOString(),
          },
        ]);
      const response = await fetch(`${BASE}/rooms/c1-general/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          clientMsgId: crypto.randomUUID(),
          kind: 'text',
          body: 'Reply',
          replyTo: target,
          mentions: [],
        }),
      });
      expect(response.status).toBe(404);
      expect(await messages()).toEqual([]);
      expect(botState().threads).toHaveLength(0);
    },
  );

  it('P5-MSW-01 validates a changed invalid target even when clientMsgId already exists', async () => {
    const clientMsgId = crypto.randomUUID();
    const send = (replyTo?: string) =>
      fetch(`${BASE}/rooms/c1-general/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          clientMsgId,
          kind: 'text',
          body: 'Original',
          mentions: [],
          ...(replyTo ? { replyTo } : {}),
        }),
      });
    expect((await send()).status).toBe(201);
    expect((await send('missing')).status).toBe(404);
    expect(await messages()).toHaveLength(1);
  });

  it('member send is idempotent and fresh chat reads publish only a due reply, also visible on Dashboard', async () => {
    const body = JSON.stringify({
      clientMsgId: crypto.randomUUID(),
      kind: 'text',
      body: 'Câu hỏi từ thành viên',
      mentions: [],
    });
    for (let n = 0; n < 2; n++) {
      const response = await fetch(`${BASE}/rooms/c1-general/messages`, {
        method: 'POST',
        headers,
        body,
      });
      expect(response.status).toBe(201);
    }
    expect(await messages()).toHaveLength(1);
    expect(botState().threads.filter((row) => row.kind === 'reply')).toHaveLength(1);
    vi.setSystemTime(new Date('2026-10-21T05:00:04.999Z'));
    expect(await messages()).toHaveLength(1);
    vi.setSystemTime(new Date('2026-10-21T05:00:05Z'));
    const after = await messages();
    expect(after).toHaveLength(2);
    const reply = after.find((row) => row.replyTo !== null);
    expect(reply?.body).toBe('Mình chia sẻ thêm về chủ đề: Câu hỏi từ thành viên');
    expect(reply?.replyTo?.text).toBe('Câu hỏi từ thành viên');
    expect(reply).not.toHaveProperty('isSimulated');
    const feed = dashboardLiveSchema.parse(
      await (await fetch(`${BASE}/dashboard/live`, { headers })).json(),
    );
    expect(feed.threads.map((row) => row.id)).toEqual([reply?.id]);
    expect(await messages()).toHaveLength(2);
  });
});
