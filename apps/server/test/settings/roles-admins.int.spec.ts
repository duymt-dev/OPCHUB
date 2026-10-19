import { DEFAULT_ROLE_PERMISSIONS } from '@opchub/shared';
import { adminAccountSchema } from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthStateService } from '@/common/auth/auth-state.service';
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
    // Trả ma trận quyền về mặc định
    await t.prisma.db.rolePermission.deleteMany({});
    await t.app.get(AuthStateService).setGrants(DEFAULT_ROLE_PERMISSIONS);
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
    // admin (không có s.role) không sửa được phân quyền
    const adm = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    expect((await t.call('/admin/roles/permissions', { token: adm })).status).toBe(403);
  });

  it('mời → "invited", trùng → 409, thu hồi lời mời', async () => {
    const email = `moi-${randomUUID().slice(0, 6)}@y.vn`;
    const inv = await t.call('/admin/admins/invite', {
      method: 'POST',
      token: owner,
      json: { email, role: 'moderator' },
    });
    expect(inv.status).toBe(201);
    const acc = adminAccountSchema.parse(await inv.json());
    expect(acc).toMatchObject({ status: 'invited', role: 'moderator', name: email.split('@')[0] });
    const dup = await t.call('/admin/admins/invite', {
      method: 'POST',
      token: owner,
      json: { email, role: 'admin' },
    });
    expect(dup.status).toBe(409);
    expect(
      (await t.call(`/admin/admins/${acc.id}`, { method: 'DELETE', token: owner })).status,
    ).toBe(200);
    const list = (await (await t.call('/admin/admins', { token: owner })).json()) as {
      items: { id: string }[];
    };
    expect(list.items.some((i) => i.id === acc.id)).toBe(false);

    const logs = (await (await t.call('/admin/audit-logs', { token: owner })).json()) as {
      items: { summary: string; actorName: string }[];
    };
    const summaries = logs.items.map((l) => l.summary);
    expect(summaries).toContain(`mời ${email} làm Điều phối viên`);
  });
});
