import { auditLog, resetMockDb } from '@opchub/shared/mock-domains';
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
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer mock.admin' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

const base = { name: 'OPC Test', province: 'Huế', description: 'd', joinMode: 'approval' };

describe('MSW admin — Nhóm cộng đồng (G4c)', () => {
  it('tạo nhóm kèm chủ nhóm, ĐPV, phòng, nội quy; chi tiết trả lại đủ + audit', async () => {
    const res = await send('/admin/groups', 'POST', {
      ...base,
      ownerId: 'm2',
      lecturerIds: ['m6', 'm2'],
      roomKeys: ['qa'],
      extraRooms: [{ name: 'tuyen-dung', description: '' }],
      rules: ['Một'],
      coverUrl: null,
    });
    expect(res.status).toBe(201);
    const g = (await res.json()) as { id: string; memberCount: number; roomKeys: string[] };
    expect(g.memberCount).toBe(2);
    const d = await get<{ lecturerIds: string[]; roomKeys: string[]; rules: string[] }>(
      `/admin/groups/${g.id}`,
    );
    expect(d.lecturerIds).toEqual(['m6']);
    expect(d.roomKeys).toEqual(['general', 'qa']);
    expect(d.rules).toEqual(['Một']);
    expect(auditLog()[0]).toMatchObject({ actorId: 'admin', action: 'group.create' });
  });

  it('sửa giữ chủ nhóm khi không gửi; xóa ghi audit; xóa lại → 404', async () => {
    const r = await send('/admin/groups/c1', 'PATCH', { ...base, name: 'OPC Hà Nội 2' });
    expect(((await r.json()) as { ownerId: string }).ownerId).toBe('m1');
    expect((await send('/admin/groups/c1', 'DELETE')).status).toBe(200);
    expect(auditLog()[0]).toMatchObject({ action: 'group.delete', target: 'c1' });
    expect((await send('/admin/groups/c1', 'DELETE')).status).toBe(404);
  });

  it('thành viên nhóm lọc trạng thái; xuất ghi audit', async () => {
    const all = await get<{ items: { status: string }[] }>('/admin/groups/members?groupIds=c1,c3');
    expect(all.items).toHaveLength(8);
    const locked = await get<{ items: unknown[] }>(
      '/admin/groups/members?groupIds=c1,c3&status=locked',
    );
    expect(locked.items).toHaveLength(1);
    const counts = await get<Record<string, number>>('/admin/groups/member-counts');
    expect(counts.c1).toBe(5);
    const ex = await send('/admin/groups/members/export', 'POST', {
      groupIds: ['c1'],
      fields: ['name'],
      status: 'all',
      format: 'csv',
    });
    expect(ex.status).toBe(202);
    expect(auditLog()[0]?.action).toBe('group.members.export');
  });

  it('từ khóa: thêm, trùng → 409, xóa', async () => {
    expect((await get<{ items: string[] }>('/admin/moderation/keywords')).items).toHaveLength(7);
    expect((await send('/admin/moderation/keywords', 'POST', { word: 'test' })).status).toBe(201);
    expect((await send('/admin/moderation/keywords', 'POST', { word: 'test' })).status).toBe(409);
    const d = await send(`/admin/moderation/keywords/${encodeURIComponent('số CCCD')}`, 'DELETE');
    expect(((await d.json()) as { items: string[] }).items).toHaveLength(7);
  });

  it('GET /admin/groups/requests không bị bắt nhầm là chi tiết nhóm', async () => {
    const r = await get<{ items: unknown[] }>('/admin/groups/requests');
    expect(r.items).toHaveLength(6);
  });

  it('trình xem chat đọc phòng và tin nhắn', async () => {
    const rooms = await get<{ items: { id: string }[] }>('/groups/c1/rooms');
    expect(rooms.items.length).toBeGreaterThan(0);
    const msgs = await get<{ items: unknown[] }>(`/rooms/${rooms.items[0]?.id}/messages`);
    expect(msgs.items.length).toBeGreaterThan(0);
  });
});
