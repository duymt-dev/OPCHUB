import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('Phân quyền + tài khoản quản trị + nhật ký (B40)', () => {
  let t: TestApp;
  let owner: string;
  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await flushAuthState(t);
    owner = await tokenOf(t, await createUser(t, { systemRole: 'super_admin' }));
  });
  afterAll(async () => {
    await t.close();
  });

  it('NA-28 RB-R05 bỏ members.view khỏi vai trò → 403 ngay (grants Redis), không bắt đăng nhập lại', async () => {
    const modU = await createUser(t, { adminPermissions: ['members.view', 'events.view'] });
    const mod = await tokenOf(t, modU);
    expect((await t.call('/admin/users', { token: mod })).status).toBe(200);
    const roleId = (
      await t.prisma.db.adminUser.findUniqueOrThrow({
        where: { id: modU.id },
        select: { roleId: true },
      })
    ).roleId;
    const put = await t.call('/admin/admin-roles/permissions', {
      method: 'PUT',
      token: owner,
      json: { [roleId ?? '']: ['events.view'] },
    });
    expect(put.status).toBe(200);
    expect((await t.call('/admin/users', { token: mod })).status).toBe(403);
    expect((await t.call('/admin/events', { token: mod })).status).toBe(200);
    // Quản trị viên (không có settings.admins) không sửa được phân quyền
    const adm = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    expect((await t.call('/admin/admin-roles', { token: adm })).status).toBe(403);
  });

  it('TIP-V2-204 route phân quyền cũ đã xoá → 404; nhật ký vẫn đọc được', async () => {
    for (const [method, path] of [
      ['GET', '/admin/roles/permissions'],
      ['PUT', '/admin/roles/permissions'],
      ['GET', '/admin/admins'],
      ['POST', '/admin/admins/invite'],
      ['DELETE', '/admin/admins/x'],
    ] as const) {
      const r = await t.call(path, {
        method,
        token: owner,
        ...(method === 'GET' ? {} : { json: {} }),
      });
      expect(r.status).toBe(404);
    }
    expect((await t.call('/admin/audit-logs', { token: owner })).status).toBe(200);
  });
});
