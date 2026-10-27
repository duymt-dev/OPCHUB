import { auditLog, resetMockDb } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** G6a + §21 — MSW Cài đặt & Phân quyền: kiểm khoá settings.*, audit (luật 10), ràng buộc nghiệp vụ */

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
  it('AT-RB01/RB05: Kế toán bị 403, Super Admin lưu ma trận + audit; xoá vai trò đang dùng 409', async () => {
    const body = { 'role-accountant': ['fees.view', 'fees.action'] };
    expect((await send('/admin/admin-roles/permissions', 'PUT', body, 'mock.adm-mai')).status).toBe(
      403,
    );
    expect((await send('/admin/admin-roles/permissions', 'PUT', body)).status).toBe(200);
    expect(auditLog()[0]?.action).toBe('roles.permissions');
    const sa = { 'role-super-admin': [] };
    expect((await send('/admin/admin-roles/permissions', 'PUT', sa)).status).toBe(409);
    const role = await json<{ id: string }>(
      send('/admin/admin-roles', 'POST', { name: 'Hỗ trợ', description: '' }),
    );
    const adm = await send('/admin/admin-accounts', 'POST', {
      name: 'Hỗ trợ 1',
      email: 'ho.tro@opchub.community',
      roleId: role.id,
      password: 'Tam@2026x',
    });
    expect(adm.status).toBe(201);
    const del = await send(`/admin/admin-roles/${role.id}`, 'DELETE');
    expect(del.status).toBe(409);
    expect((await send('/admin/admin-roles/role-admin', 'DELETE')).status).toBe(409);
  });

  it('lĩnh vực: trùng tên 409, đang dùng không xoá được, đổi thứ tự', async () => {
    const list = await json<{ items: { id: string; projectCount: number }[] }>(
      send('/admin/categories'),
    );
    expect(list.items).toHaveLength(32);
    const dup = { name: 'fintech', color: '#1677FF', scope: ['project'] };
    expect((await send('/admin/categories', 'POST', dup)).status).toBe(409);
    // k29 "Chuyển đổi số & AI" có dự án (p1, p2, p10) — D-89 v4
    expect((await send('/admin/categories/k29', 'DELETE')).status).toBe(409);
    const ids = list.items.map((c) => c.id).reverse();
    const re = await json<{ id: string }[]>(send('/admin/categories/order', 'PUT', { ids }));
    expect(re[0]?.id).toBe('k32');
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

  it('TK quản trị: 6 TK, trùng email 409, Super Admin bất khả xâm phạm, nhật ký ghi lại', async () => {
    const list = await json<{ items: { id: string }[] }>(send('/admin/admin-accounts'));
    expect(list.items).toHaveLength(6);
    const body = {
      name: 'X',
      email: 'trang.pham@opchub.community',
      roleId: 'role-editor',
      password: 'Tam@2026x',
    };
    expect((await send('/admin/admin-accounts', 'POST', body)).status).toBe(409);
    const member = { ...body, email: 'an.nguyen@mediasoft.vn' };
    expect((await send('/admin/admin-accounts', 'POST', member)).status).toBe(409);
    expect((await send('/admin/admin-accounts', 'POST', { ...body, email: 'x@y' })).status).toBe(
      400,
    );
    expect((await send('/admin/admin-accounts/admin', 'DELETE')).status).toBe(409);
    const lock = await send('/admin/admin-accounts/adm-yen/status', 'POST', { status: 'locked' });
    expect(lock.status).toBe(200);
    expect((await send('/admin/admin-accounts/adm-hang', 'DELETE')).status).toBe(200);
    const log = await json<{ items: { summary: string }[] }>(send('/admin/audit-logs'));
    expect(log.items[0]?.summary).toContain('thu hồi quyền quản trị của Ngô Thu Hằng');
  });

  it('AT-RB04: TK bị khoá → 403 "Tài khoản quản trị đã bị khóa"; TK thành viên → WRONG_PORTAL', async () => {
    await send('/admin/admin-accounts/adm-yen/status', 'POST', { status: 'locked' });
    const login = (identifier: string, password: string) =>
      json<{ error: { code: string; message: string } }>(
        send('/admin/auth/login', 'POST', { identifier, password }),
      );
    const locked = await login('yen.do@opchub.community', 'Admin@2026');
    expect(locked.error.message).toBe('Tài khoản quản trị đã bị khóa');
    expect((await login('an.nguyen@mediasoft.vn', 'User@2026')).error.code).toBe('WRONG_PORTAL');
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
