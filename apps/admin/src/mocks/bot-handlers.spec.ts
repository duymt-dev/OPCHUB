import { botState, mockDb, resetMockDb } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => resetMockDb());
afterAll(() => server.close());

const get = async <T>(path: string) => (await fetch(`${BASE}${path}`)).json() as Promise<T>;
const send = (path: string, method: string, body?: unknown) =>
  fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

interface Thread {
  id: string;
  scriptId: string;
  status: string;
  lines: { name: string }[];
}

describe('MSW admin — Bot tương tác (G4d)', () => {
  it('3 hội thoại seed: 2 đã đăng, 1 chờ duyệt, có lượt persona', async () => {
    const b = await get<{ items: Thread[] }>('/admin/bot/threads');
    expect(b.items.map((t) => t.status)).toEqual(['posted', 'posted', 'pending']);
    expect(b.items[0]?.lines[0]?.name).toBe('Võ Ngọc Trâm');
  });

  it('chạy ngay → hội thoại chờ duyệt + audit', async () => {
    const r = await send('/admin/scripts/sc2/run', 'POST');
    expect(r.status).toBe(202);
    const b = await get<{ items: Thread[] }>('/admin/bot/threads');
    expect(b.items[0]).toMatchObject({ scriptId: 'sc2', status: 'pending' });
    expect(botState().audit[0]).toMatchObject({ action: 'script.run', entityId: 'sc2' });
  });

  it('duyệt & đăng: tin mô phỏng vào phòng Chung, duyệt lần 2 → 409', async () => {
    const before = mockDb().messages.get('c4-general')?.length ?? 0;
    const r = await send('/admin/bot/threads/th3/approve', 'POST');
    expect(await r.json()).toMatchObject({ status: 'posted', groupCount: 2 });
    const msgs = mockDb().messages.get('c4-general') ?? [];
    expect(msgs.length).toBe(before + 3);
    expect(msgs.at(-1)?.isSimulated).toBe(true);
    expect((await send('/admin/bot/threads/th3/approve', 'POST')).status).toBe(409);
    const act = await get<{ items: { text: string }[]; todayCount: number }>('/admin/bot/activity');
    expect(act.todayCount).toBe(6);
    expect(act.items[0]?.text).toContain('Ứng dụng AI vào vận hành OPC');
  });

  it('bỏ hội thoại chờ duyệt; hội thoại đã đăng → 409', async () => {
    expect((await send('/admin/bot/threads/th3', 'DELETE')).status).toBe(200);
    expect((await send('/admin/bot/threads/th1', 'DELETE')).status).toBe(409);
    const b = await get<{ items: Thread[] }>('/admin/bot/threads');
    expect(b.items).toHaveLength(2);
    expect(botState().audit[0]?.action).toBe('bot_thread.reject');
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
