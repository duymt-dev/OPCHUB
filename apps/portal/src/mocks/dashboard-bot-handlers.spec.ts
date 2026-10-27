import { setupServer } from 'msw/node';
import { chatMessageSchema, dashboardLiveSchema } from '@opchub/shared/api-domains';
import {
  advanceMockBot,
  hideMockBotMessages,
  mockDb,
  resetMockDb,
  runBotScript,
} from '@opchub/shared/mock-domains';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;
const headers = { Authorization: 'Bearer mock.m1' };
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
/** D-89: MSW không seed lịch sử bot → chạy kịch bản thật để có tin mở đầu ở 2 nhóm */
function postScript() {
  const db = mockDb();
  const script = db.scripts[0];
  if (!script) throw new Error('Missing script');
  script.groupIds = ['c1', 'c2'];
  for (const persona of db.personas) {
    persona.groupIds = ['c1', 'c2'];
    persona.enabled = true;
    persona.activeHours = '00:00 - 24:00';
    persona.postsPerDay = 120;
  }
  const run = runBotScript(script.id);
  if (!run.ok) throw new Error(run.message);
  advanceMockBot();
}
beforeEach(() => {
  resetMockDb();
  postScript();
});
afterAll(() => server.close());
const dashboard = async () =>
  dashboardLiveSchema.parse(await (await fetch(`${BASE}/dashboard/live`, { headers })).json());

describe('UAT-15 REQ-141 LK-11 MSW Portal stored bot history', () => {
  it('Dashboard cards refer to actual paginated chat messages with no private identity fields', async () => {
    const feed = await dashboard();
    expect(feed.threads).toHaveLength(2);
    for (const thread of feed.threads) {
      mockDb().groupMembers.get('m1')?.set(thread.groupId, 'member');
      const response = await fetch(`${BASE}/rooms/${thread.groupId}-general/messages?size=50`, {
        headers,
      });
      expect(response.status).toBe(200);
      const page = (await response.json()) as { items: unknown[] };
      const messages = page.items.map((message) => chatMessageSchema.strict().parse(message));
      expect(messages.find((m) => m.id === thread.id)?.body).toBe(thread.body);
      expect(
        page.items.every((m) => typeof m === 'object' && m !== null && !('isSimulated' in m)),
      ).toBe(true);
    }
  });

  it('after scoped hide, both fresh Dashboard and chat reads drop only affected bot history', async () => {
    const before = await dashboard();
    const target = before.threads[0];
    if (!target) throw new Error('Missing seeded discussion');
    const result = hideMockBotMessages('admin', { groupIds: [target.groupId] });
    expect(result.ok).toBe(true);
    const after = await dashboard();
    expect(after.threads.map((t) => t.id)).toEqual(
      before.threads.filter((t) => t.groupId !== target.groupId).map((t) => t.id),
    );
    const response = await fetch(`${BASE}/rooms/${target.groupId}-general/messages?size=50`, {
      headers,
    });
    const page = (await response.json()) as { items: { id: string }[] };
    expect(page.items.some((m) => m.id === target.id)).toBe(false);
    expect(page.items.some((m) => m.id.startsWith(`${target.groupId}-general-`))).toBe(true);
  });
});
