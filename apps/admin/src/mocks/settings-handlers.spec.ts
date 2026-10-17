import { auditLog, resetMockDb } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** G6a — MSW Cài đặt & Phân quyền: kiểm quyền s.role (D-42), audit (luật 10), ràng buộc nghiệp vụ */

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => resetMockDb());
afterAll(() => server.close());

const send = (path: string, method = 'GET', body?: unknown, token = 'mock.admin') =>
  fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const json = async <T>(r: Promise<Response>) => (await r).json() as Promise<T>;

describe('MSW admin — cài đặt', () => {
  it('phân quyền: thành viên thường bị 403, Super Admin lưu được + audit', async () => {
    const body = { admin: ['m.view'], moderator: [], member: [] };
    expect((await send('/admin/roles/permissions', 'PUT', body, 'mock.m2')).status).toBe(403);
    expect((await send('/admin/roles/permissions', 'PUT', body)).status).toBe(200);
    expect(auditLog()[0]?.action).toBe('roles.permissions');
  });

  it('lĩnh vực: trùng tên 409, đang dùng không xoá được, đổi thứ tự', async () => {
    const list = await json<{ items: { id: string; projectCount: number }[] }>(
      send('/admin/categories'),
    );
    expect(list.items).toHaveLength(14);
    const dup = { name: 'fintech', color: '#1677FF', scope: ['project'] };
    expect((await send('/admin/categories', 'POST', dup)).status).toBe(409);
    expect((await send('/admin/categories/k1', 'DELETE')).status).toBe(409);
    const ids = list.items.map((c) => c.id).reverse();
    const re = await json<{ id: string }[]>(send('/admin/categories/order', 'PUT', { ids }));
    expect(re[0]?.id).toBe('k14');
    expect((await send('/admin/categories/order', 'PUT', { ids: ['k1'] })).status).toBe(409);
  });

  it('SMTP verify: thiếu key → lỗi; có key → OK', async () => {
    const base = { host: 'smtp-relay.brevo.com', port: 587, encryption: 'tls', username: 'u' };
    const bad = await json<{ ok: boolean }>(send('/admin/smtp/verify', 'POST', base));
    expect(bad.ok).toBe(false);
    const good = await json<{ ok: boolean }>(
      send('/admin/smtp/verify', 'POST', { ...base, key: 'k' }),
    );
    expect(good.ok).toBe(true);
  });

  it('quản trị viên: mời trùng 409, chủ sở hữu không thu hồi được, nhật ký ghi lại', async () => {
    const inv = await send('/admin/admins/invite', 'POST', { email: 'x@y.vn', role: 'admin' });
    expect(inv.status).toBe(201);
    const dup = await send('/admin/admins/invite', 'POST', { email: 'X@y.vn', role: 'admin' });
    expect(dup.status).toBe(409);
    expect(
      (await send('/admin/admins/invite', 'POST', { email: 'x@y', role: 'admin' })).status,
    ).toBe(400);
    expect((await send('/admin/admins/ad1', 'DELETE')).status).toBe(409);
    expect((await send('/admin/admins/ad2', 'DELETE')).status).toBe(200);
    const log = await json<{ items: { summary: string }[] }>(send('/admin/audit-logs'));
    expect(log.items[0]?.summary).toContain('thu hồi quyền quản trị của Lê Minh Anh');
    expect(log.items.length).toBeGreaterThanOrEqual(8);
  });

  it('bảo mật + ngôn ngữ: vá từng phần, không tắt ngôn ngữ mặc định', async () => {
    const sec = await json<{ minPasswordLength: number; providers: { enabled: boolean }[] }>(
      send('/admin/settings/security', 'PATCH', {
        minPasswordLength: 12,
        provider: { id: 'google', enabled: false },
      }),
    );
    expect(sec.minPasswordLength).toBe(12);
    expect(sec.providers.filter((p) => p.enabled)).toHaveLength(5);
    const off = { toggle: { code: 'vi', enabled: false } };
    expect((await send('/admin/settings/languages', 'PATCH', off)).status).toBe(409);
    const ok = await send('/admin/settings/languages', 'PATCH', { defaultLocale: 'en', ...off });
    expect(ok.status).toBe(200);
  });

  it('cài đặt chung: email sai 400, vá được', async () => {
    expect((await send('/admin/settings/general', 'PATCH', { contactEmail: 'x' })).status).toBe(
      400,
    );
    const g = await json<{ platformName: string }>(
      send('/admin/settings/general', 'PATCH', { platformName: 'OPC' }),
    );
    expect(g.platformName).toBe('OPC');
  });
});
