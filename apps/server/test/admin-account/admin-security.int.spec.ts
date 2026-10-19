import { adminLoginResponseSchema, apiErrorSchema } from '@opchub/shared/api';
import { adminAccountRowSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState, loginOf } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { cleanupAdminAccounts, roleIds } from './helpers';

const ORIGIN = 'http://localhost:3001';

describe('Khoá / mở / thu hồi / đổi vai trò TK quản trị (TIP-V2-202, RB-R04, RB-R08, SEC-R03)', () => {
  let t: TestApp;
  let roles: Record<string, string>;
  let owner: string;
  let ownerId: string;

  const errorOf = async (r: Response) => apiErrorSchema.parse(await r.json()).error;
  const status = (id: string, s: 'active' | 'locked', token = owner) =>
    t.call(`/admin/admin-accounts/${id}/status`, {
      method: 'POST',
      token,
      json: { status: s, reason: 'kiểm thử' },
    });
  const role = (id: string, roleId: string) =>
    t.call(`/admin/admin-accounts/${id}/role`, { method: 'PATCH', token: owner, json: { roleId } });
  const revoke = (id: string) =>
    t.call(`/admin/admin-accounts/${id}`, { method: 'DELETE', token: owner });
  const audits = (id: string) =>
    t.prisma.db.auditLog.findMany({
      where: { entity: 'admin_user', entityId: id, action: { startsWith: 'admin_account.' } },
      select: { action: true, tag: true, summary: true },
      orderBy: { createdAt: 'asc' },
    });
  const refreshCookie = async (email: string, password: string) =>
    (await loginOf(t, { email, password, realm: 'admin' })).headers
      .getSetCookie()
      .find((c) => c.startsWith('opchub_art='))
      ?.split(';')[0];

  beforeAll(async () => {
    t = await createTestApp();
    roles = await roleIds(t);
  });
  beforeEach(async () => {
    await flushAuthState(t);
    const sa = await createUser(t, { systemRole: 'super_admin' });
    ownerId = sa.id;
    owner = await tokenOf(t, sa);
  });
  afterAll(async () => {
    await cleanupAdminAccounts(t);
    await t.close();
  });

  it('REQ-328 khoá/mở/đổi vai trò/thu hồi ghi audit', async () => {
    const a = await createUser(t, { systemRole: 'admin' });
    const name = (
      await t.prisma.db.adminUser.findUniqueOrThrow({ where: { id: a.id }, select: { name: true } })
    ).name;
    const locked = await status(a.id, 'locked');
    expect(locked.status).toBe(200);
    expect(adminAccountRowSchema.parse(await locked.json()).status).toBe('locked');
    // Luật 7: khoá lại TK đã khoá → 409
    expect((await status(a.id, 'locked')).status).toBe(409);
    expect((await status(a.id, 'active')).status).toBe(200);
    const changed = await role(a.id, roles.editor ?? '');
    expect(adminAccountRowSchema.parse(await changed.json()).roleName).toBe('Biên tập nội dung');
    expect((await role(a.id, roles.super_admin ?? '')).status).toBe(400);
    expect((await revoke(a.id)).status).toBe(200);
    expect((await revoke(a.id)).status).toBe(404);

    expect(await audits(a.id)).toEqual([
      {
        action: 'admin_account.lock',
        tag: 'permission',
        summary: `khóa tài khoản quản trị ${name}`,
      },
      {
        action: 'admin_account.unlock',
        tag: 'permission',
        summary: `mở khóa tài khoản quản trị ${name}`,
      },
      {
        action: 'admin_account.role',
        tag: 'permission',
        summary: `đổi vai trò ${name} thành Biên tập nội dung`,
      },
      {
        action: 'admin_account.revoke',
        tag: 'permission',
        summary: `thu hồi quyền quản trị của ${name}`,
      },
    ]);
    const row = await t.prisma.db.adminUser.findUniqueOrThrow({
      where: { id: a.id },
      select: { deletedAt: true },
    });
    expect(row.deletedAt).not.toBeNull();
    expect((await loginOf(t, { ...a, realm: 'admin' })).status).toBe(401);
  });

  it('REQ-353 khoá thu hồi refresh + phiên đang mở 403', async () => {
    const a = await createUser(t, { systemRole: 'admin' });
    const tk = await tokenOf(t, a);
    const cookie = (await refreshCookie(a.email, a.password)) ?? '';
    expect((await t.call('/admin/overview', { token: tk })).status).toBe(200);
    expect((await status(a.id, 'locked')).status).toBe(200);
    const next = await t.call('/admin/overview', { token: tk });
    expect(next.status).toBe(403);
    expect((await errorOf(next)).message).toBe('Tài khoản đã bị khóa, liên hệ hỗ trợ');
    const ref = await t.call('/admin/auth/refresh', {
      method: 'POST',
      headers: { Origin: ORIGIN, Cookie: cookie },
    });
    expect([401, 403]).toContain(ref.status);
    expect(
      await t.prisma.db.adminRefreshToken.count({ where: { adminUserId: a.id, revokedAt: null } }),
    ).toBe(0);
    // Mở khoá → đăng nhập lại được
    expect((await status(a.id, 'active')).status).toBe(200);
    const again = await loginOf(t, { ...a, realm: 'admin' });
    expect(again.status).toBe(200);
    const fresh = adminLoginResponseSchema.parse(await again.json());
    expect((await t.call('/admin/overview', { token: fresh.accessToken })).status).toBe(200);
  });

  it('REQ-353 thu hồi: phiên đang mở bị từ chối, không đăng nhập lại được', async () => {
    const a = await createUser(t, { systemRole: 'admin' });
    const tk = await tokenOf(t, a);
    expect((await revoke(a.id)).status).toBe(200);
    expect((await t.call('/admin/overview', { token: tk })).status).toBe(401);
    expect((await loginOf(t, { ...a, realm: 'admin' })).status).toBe(401);
  });

  it('RB-R04 đổi vai trò: token cũ 401, refresh (không đăng nhập lại) nhận quyền vai trò mới', async () => {
    const a = await createUser(t, { systemRole: 'admin' });
    const login = await loginOf(t, { ...a, realm: 'admin' });
    const tk = adminLoginResponseSchema.parse(await login.json()).accessToken;
    const cookie =
      login.headers
        .getSetCookie()
        .find((c) => c.startsWith('opchub_art='))
        ?.split(';')[0] ?? '';
    expect((await t.call('/admin/users', { token: tk })).status).toBe(200);
    // Biên tập nội dung không có members.view
    expect((await role(a.id, roles.editor ?? '')).status).toBe(200);
    expect((await t.call('/admin/users', { token: tk })).status).toBe(401);
    const ref = await t.call('/admin/auth/refresh', {
      method: 'POST',
      headers: { Origin: ORIGIN, Cookie: cookie },
    });
    expect(ref.status).toBe(200);
    const fresh = adminLoginResponseSchema.parse(await ref.json());
    expect(fresh.admin.roleName).toBe('Biên tập nội dung');
    expect((await t.call('/admin/users', { token: fresh.accessToken })).status).toBe(403);
  });

  it('REQ-324 Super Admin không khoá/thu hồi được', async () => {
    const sa = await createUser(t, { systemRole: 'super_admin' });
    for (const r of [
      await status(sa.id, 'locked'),
      await role(sa.id, roles.admin ?? ''),
      await revoke(sa.id),
    ]) {
      expect(r.status).toBe(409);
      expect((await errorOf(r)).message).toBe('Không thể thao tác trên tài khoản Super Admin');
    }
    expect((await status(ownerId, 'locked')).status).toBe(409);
    // TK không có quyền settings.admins → 403
    const adm = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    const other = await createUser(t, { systemRole: 'admin' });
    expect((await status(other.id, 'locked', adm)).status).toBe(403);
  });
});
