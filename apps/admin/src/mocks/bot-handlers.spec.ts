import {
  advanceMockBot,
  botState,
  mockDb,
  resetMockDb,
  seedManualMockBotScenario,
} from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T05:00:00Z'));
  resetMockDb();
  seedManualMockBotScenario();
});
afterEach(() => vi.useRealTimers());
afterAll(() => server.close());

const get = async <T>(path: string) =>
  (
    await fetch(`${BASE}${path}`, { headers: { Authorization: 'Bearer mock.admin' } })
  ).json() as Promise<T>;
const send = (path: string, method: string, body?: unknown) =>
  fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer mock.admin' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

interface Thread {
  id: string;
  scriptId: string;
  status: string;
  lines: { name: string }[];
}

describe('MSW admin — Bot tương tác (G4d)', () => {
  it('REQ-208 seed threads expose done/running progress and persona identity', async () => {
    const b = await get<{ items: Thread[] }>('/admin/bot/threads');
    expect(b.items.map((t) => t.status)).toEqual(['done', 'done', 'running']);
    expect(b.items[0]?.lines[0]?.name).toBe('Võ Ngọc Trâm');
  });

  it('REQ-208 run schedules, advances one due turn and audits the action', async () => {
    const r = await send('/admin/scripts/sc2/run', 'POST');
    expect(r.status).toBe(202);
    const b = await get<{ items: Thread[] }>('/admin/bot/threads');
    expect(b.items[0]).toMatchObject({ scriptId: 'sc2', status: 'running', cursor: 1 });
    expect(botState().audit[0]).toMatchObject({ action: 'script.run', entityId: 'sc2' });
    mockDb().scripts.find((s) => s.id === 'sc2')!.enabled = false;
    expect((await send('/admin/scripts/sc2/run', 'POST')).status).toBe(409);
  });

  it('REQ-208 scheduled turns post individually to default rooms and terminal stop returns 409', async () => {
    mockDb().botSettings.replyToMembers = false;
    const script = mockDb().scripts.find((s) => s.id === 'sc3')!;
    for (const line of script.lines) {
      const persona = mockDb().personas.find((p) => p.id === line.personaId)!;
      persona.groupIds = [...script.groupIds];
      persona.enabled = true;
      persona.activeHours = '00:00 - 24:00';
      persona.postsPerDay = 20;
    }
    const before = mockDb().messages.get('c4-general')?.length ?? 0;
    advanceMockBot();
    const rec = botState().threads.find((t) => t.id === 'th3')!;
    expect(rec).toMatchObject({ status: 'running', cursor: 1 });
    expect(mockDb().messages.get('c4-general')?.length).toBe(before + 1);
    while (rec.nextAt !== null) advanceMockBot(rec.nextAt);
    expect(rec).toMatchObject({ status: 'done', cursor: 3 });
    const msgs = mockDb().messages.get('c4-general') ?? [];
    expect(msgs.length).toBe(before + 3);
    expect(msgs.at(-1)?.isSimulated).toBe(true);
    expect((await send('/admin/bot/threads/th3/stop', 'POST')).status).toBe(409);
    const act = await get<{ items: { text: string }[]; todayCount: number }>('/admin/bot/activity');
    expect(act.todayCount).toBe(6);
    expect(act.items[0]?.text).toContain('Ứng dụng AI vào vận hành OPC');
  });

  it('REQ-208 stop retains history and audits; terminal stop returns 409', async () => {
    expect((await send('/admin/bot/threads/th3/stop', 'POST')).status).toBe(200);
    expect((await send('/admin/bot/threads/th1/stop', 'POST')).status).toBe(409);
    const b = await get<{ items: Thread[] }>('/admin/bot/threads');
    expect(b.items).toHaveLength(3);
    expect(botState().audit[0]?.action).toBe('bot_thread.stop');
  });

  it('xoá persona / kịch bản ghi audit (luật 10)', async () => {
    expect((await send('/admin/personas/ps5', 'DELETE')).status).toBe(200);
    expect((await send('/admin/scripts/sc1', 'DELETE')).status).toBe(200);
    expect(botState().audit.map((a) => a.action)).toEqual(['script.delete', 'persona.delete']);
    expect((await send('/admin/personas/ps5', 'DELETE')).status).toBe(404);
  });

  it('persona mới giữ màu, khung giờ, tần suất', async () => {
    const r = await send('/admin/personas', 'POST', {
      name: 'Bùi Minh Châu',
      title: 'UX',
      province: 'Huế',
      tone: 'Truyền cảm hứng',
      groupIds: ['c1'],
      color: '#EB2F96',
      postsPerDay: 4,
      activeHours: '18:00 – 23:00',
    });
    expect(r.status).toBe(201);
    expect(await r.json()).toMatchObject({ color: '#EB2F96', postsPerDay: 4, postCount: 0 });
  });

  it('cấu hình: tự sinh / tự trả lời', async () => {
    const r = await send('/admin/bot/settings', 'PATCH', { autoGenerate: false });
    expect(await r.json()).toMatchObject({ autoGenerate: false, replyToMembers: true });
  });
});
