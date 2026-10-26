import { resetMockDb } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => resetMockDb());
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

interface Page<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

describe('MSW admin — thành viên & phí', () => {
  it('users có trạng thái khóa theo prototype (m4)', async () => {
    const b = await get<Page<{ id: string; status: string }>>('/admin/users?type=personal');
    expect(b.items.find((u) => u.id === 'm4')?.status).toBe('locked');
  });

  it('khóa / mở khóa, đặt lại cùng trạng thái → 409', async () => {
    expect((await send('/admin/users/m1/status', 'PATCH', { status: 'locked' })).status).toBe(200);
    expect((await send('/admin/users/m1/status', 'PATCH', { status: 'locked' })).status).toBe(409);
    expect((await send('/admin/users/m1/status', 'PATCH', { status: 'x' })).status).toBe(400);
  });

  it('phí lọc theo trạng thái', async () => {
    const b = await get<Page<{ status: string }>>('/admin/fees?status=pending_payment');
    expect(b.total).toBe(1);
    expect(b.size).toBe(10);
  });

  it('ghi nhận đã thu → active; gửi nhắc hàng loạt', async () => {
    const r = await send('/admin/fees/m6/collect', 'POST');
    expect(((await r.json()) as { status: string }).status).toBe('active');
    const bulk = await send('/admin/fees/remind', 'POST', { userIds: ['m6', 'm2'] });
    expect(bulk.status).toBe(202);
    expect((await send('/admin/fees/m6/oops', 'POST')).status).toBe(404);
  });

  it('gán nhóm cần ít nhất một id', async () => {
    expect(
      (await send('/admin/users/assign-groups', 'POST', { userIds: [], groupIds: ['c1'] })).status,
    ).toBe(400);
    const ok = await send('/admin/users/assign-groups', 'POST', {
      userIds: ['m1'],
      groupIds: ['c9'],
    });
    expect(((await ok.json()) as { updated: number }).updated).toBe(1);
  });
});

describe('MSW admin — nhóm, báo cáo, sự kiện, dự án', () => {
  it('tạo nhóm, trùng tên → 409', async () => {
    const g = {
      name: 'OPC Test',
      province: 'Hà Nội',
      description: '',
      kind: 'industry',
      industry: 'Thử nghiệm',
    };
    expect((await send('/admin/groups', 'POST', g)).status).toBe(201);
    expect((await send('/admin/groups', 'POST', g)).status).toBe(409);
  });

  it('báo cáo lọc theo nguồn và xử lý', async () => {
    const b = await get<Page<{ source: string }>>('/admin/reports?source=auto');
    expect(b.total).toBe(2);
    const r = await send('/admin/reports/r2/action', 'POST', { action: 'warn' });
    expect(((await r.json()) as { status: string }).status).toBe('resolved');
  });

  it('tạo sự kiện suy ra ngày giờ VN', async () => {
    const r = await send('/admin/events', 'POST', {
      title: 'OPC Day Huế',
      mode: 'offline',
      startsAt: '2026-11-01T02:00:00.000Z',
      place: 'Huế',
      seats: 50,
      description: '',
    });
    expect(await r.json()).toMatchObject({ day: 'CN, 01/11', time: '09:00' });
  });

  it('danh sách đăng ký sự kiện', async () => {
    const b = await get<Page<{ userId: string }>>('/admin/events/e2/registrations');
    // G5a: kèm người đăng ký mẫu của prototype (drawer "Danh sách đăng ký")
    expect(b.items.map((x) => x.userId)).toContain('m1');
  });

  it('duyệt dự án: thiếu ghi chú khi từ chối → 400', async () => {
    expect((await send('/admin/projects/p8/review', 'POST', { decision: 'reject' })).status).toBe(
      400,
    );
    const ok = await send('/admin/projects/p8/review', 'POST', { decision: 'approve' });
    expect(((await ok.json()) as { status: string }).status).toBe('published');
    const pend = await get<Page<unknown>>('/admin/projects?status=pending_review');
    expect(pend.total).toBe(1);
  });

  it('nhà đầu tư lọc theo loại (gộp theo người — G5c)', async () => {
    const b = await get<Page<{ kind: string }>>('/admin/investors?kind=individual');
    expect(b.total).toBe(1);
  });
});

describe('MSW admin — dịch vụ, bot, cài đặt', () => {
  it('phiếu YC: tìm + bình luận (D-72 không cập nhật trạng thái)', async () => {
    const b = await get<Page<{ code: string }>>('/admin/service-requests?q=YC-1005');
    expect(b.items.map((x) => x.code)).toEqual(['YC-1005']);
    expect(
      (await send('/admin/service-requests/YC-1005/comments', 'POST', { body: 'Đã gọi' })).status,
    ).toBe(201);
  });

  it('persona CRUD', async () => {
    const r = await send('/admin/personas', 'POST', {
      name: 'Bot Mới',
      title: 'Tư vấn',
      province: 'Huế',
      tone: '',
    });
    const p = (await r.json()) as { id: string };
    expect(r.status).toBe(201);
    expect((await send(`/admin/personas/${p.id}`, 'DELETE')).status).toBe(200);
    expect((await get<{ items: unknown[] }>('/admin/personas')).items).toHaveLength(6);
  });

  it('chạy kịch bản ghi vào nhật ký bot', async () => {
    expect((await send('/admin/scripts/sc1/run', 'POST')).status).toBe(202);
    const log = await get<Page<{ scriptId: string; status: string }>>('/admin/bot/log');
    expect(log.items[0]).toMatchObject({ scriptId: 'sc1', status: 'scheduled' });
    expect(log.total).toBe(4);
  });

  it('bot settings PATCH một phần', async () => {
    const r = await send('/admin/bot/settings', 'PATCH', { replyToMembers: false });
    expect(await r.json()).toMatchObject({ replyToMembers: false, enabled: true });
  });

  it('quyền vai trò §21: key lạ → 400, ma trận giữ nguyên', async () => {
    const bad = { 'role-lecturer': ['x'] };
    expect((await send('/admin/admin-roles/permissions', 'PUT', bad)).status).toBe(400);
    const cur = await get<{ items: { id: string; permissions: string[] }[] }>('/admin/admin-roles');
    expect(cur.items.find((r) => r.id === 'role-lecturer')?.permissions).toContain(
      'groups.moderate',
    );
  });

  it('SMTP không trả key, test thất bại khi chưa có key', async () => {
    const t = await send('/admin/smtp/test', 'POST', { to: 'a@b.vn' });
    expect(((await t.json()) as { ok: boolean }).ok).toBe(false);
    const cur = await get<Record<string, unknown>>('/admin/smtp');
    const put = await send('/admin/smtp', 'PUT', { ...cur, key: 'secret' });
    const saved = (await put.json()) as Record<string, unknown>;
    expect(saved.hasKey).toBe(true);
    expect(saved).not.toHaveProperty('key');
  });

  it('email chào mừng và danh mục', async () => {
    const w = await get<{ rules: string[] }>('/admin/mail/welcome');
    expect(w.rules).toHaveLength(5);
    expect((await get<{ items: unknown[] }>('/admin/categories')).items).toHaveLength(14);
  });
});
