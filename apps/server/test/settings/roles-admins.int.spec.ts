import { DEFAULT_ROLE_PERMISSIONS } from '@opchub/shared';
import { adminAccountSchema, rolePermissionsSchema } from '@opchub/shared/api-domains';
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

  it('bỏ m.view của điều phối viên → 403 ngay (grants Redis) + token cũ 401 (perm_version)', async () => {
    const modU = await createUser(t, { systemRole: 'moderator' });
    const mod = await tokenOf(t, modU);
    expect((await t.call('/admin/users', { token: mod })).status).toBe(200);
    const cur = rolePermissionsSchema.parse(
      await (await t.call('/admin/roles/permissions', { token: owner })).json(),
    );
    const next = { ...cur, moderator: cur.moderator.filter((k) => k !== 'm.view') };
    const put = await t.call('/admin/roles/permissions', {
      method: 'PUT',
      token: owner,
      json: next,
    });
    expect(rolePermissionsSchema.parse(await put.json()).moderator).not.toContain('m.view');
    expect((await t.call('/admin/users', { token: mod })).status).toBe(401);
    const fresh = await tokenOf(t, modU);
    expect((await t.call('/admin/users', { token: fresh })).status).toBe(403);
    const log = await t.prisma.db.auditLog.findFirst({
      where: { action: 'roles.permissions' },
      orderBy: { createdAt: 'desc' },
      select: { summary: true, tag: true },
    });
    expect(log).toEqual({ summary: 'cập nhật phân quyền vai trò', tag: 'permission' });
    // admin (không có s.role) không sửa được phân quyền
    const adm = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    expect((await t.call('/admin/roles/permissions', { token: adm })).status).toBe(403);
  });

  it('mời → "invited", trùng → 409, thu hồi lời mời; thu hồi user → member; chủ sở hữu → 409', async () => {
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

    const modU = await createUser(t, { systemRole: 'moderator' });
    expect(
      (await t.call(`/admin/admins/${modU.id}`, { method: 'DELETE', token: owner })).status,
    ).toBe(200);
    const row = await t.prisma.db.user.findUniqueOrThrow({
      where: { id: modU.id },
      select: { systemRole: true },
    });
    expect(row.systemRole).toBe('member');
    const sa = await createUser(t, { systemRole: 'super_admin' });
    expect(
      (await t.call(`/admin/admins/${sa.id}`, { method: 'DELETE', token: owner })).status,
    ).toBe(409);

    const logs = (await (await t.call('/admin/audit-logs', { token: owner })).json()) as {
      items: { summary: string; actorName: string }[];
    };
    const summaries = logs.items.map((l) => l.summary);
    expect(summaries).toContain(`mời ${email} làm Điều phối viên`);
    expect(summaries).toContain(`thu hồi quyền quản trị của ${email.split('@')[0]}`);
  });
});
