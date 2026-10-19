import {
  ADMIN_PERMISSION_KEYS,
  ADMIN_SYSTEM_ROLES,
  DEFAULT_ADMIN_ROLE_PERMISSIONS,
} from '@opchub/shared';
import { apiErrorSchema } from '@opchub/shared/api';
import { adminRoleListSchema, adminRoleSchema } from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthStateService } from '@/common/auth/auth-state.service';
import { RoleGrantsService } from '@/modules/admin-account';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { cleanupAdminAccounts, roleIds } from './helpers';

describe('Vai trò & phân quyền (TIP-V2-201, RB-R04, NA-28)', () => {
  let t: TestApp;
  let owner: string;
  let roles: Record<string, string>;
  const id = (key: string) => roles[key] ?? '';
  const list = async () =>
    adminRoleListSchema.parse(await (await t.call('/admin/admin-roles', { token: owner })).json())
      .items;
  const put = (json: unknown, token = owner) =>
    t.call('/admin/admin-roles/permissions', { method: 'PUT', token, json });
  const post = (json: unknown, token = owner) =>
    t.call('/admin/admin-roles', { method: 'POST', token, json });
  const resetMatrix = async () => {
    const r = await put({
      [id('admin')]: DEFAULT_ADMIN_ROLE_PERMISSIONS.admin,
      [id('lecturer')]: DEFAULT_ADMIN_ROLE_PERMISSIONS.lecturer,
      [id('accountant')]: DEFAULT_ADMIN_ROLE_PERMISSIONS.accountant,
      [id('editor')]: DEFAULT_ADMIN_ROLE_PERMISSIONS.editor,
    });
    expect(r.status).toBe(200);
  };

  beforeAll(async () => {
    t = await createTestApp();
    roles = await roleIds(t);
  });
  beforeEach(async () => {
    await flushAuthState(t);
    owner = await tokenOf(t, await createUser(t, { systemRole: 'super_admin' }));
  });
  afterAll(async () => {
    owner = await tokenOf(t, await createUser(t, { systemRole: 'super_admin' }));
    await resetMatrix();
    await cleanupAdminAccounts(t);
    await t.close();
  });

  it('REQ-324 5 vai trò hệ thống, không sửa tên vai trò hệ thống', async () => {
    await resetMatrix();
    const system = (await list()).filter((r) => r.isSystem);
    expect(system.map((r) => [r.key, r.name, r.description])).toEqual(
      ADMIN_SYSTEM_ROLES.map((r) => [r.key, r.name, r.description]),
    );
    // Ma trận §21.2 từng ô (25 × 4) + Super Admin đủ 25 khoá
    for (const r of system) {
      const want =
        r.key === 'super_admin'
          ? ADMIN_PERMISSION_KEYS
          : DEFAULT_ADMIN_ROLE_PERMISSIONS[r.key as keyof typeof DEFAULT_ADMIN_ROLE_PERMISSIONS];
      expect([...r.permissions].sort()).toEqual([...want].sort());
    }
    const patch = await t.call(`/admin/admin-roles/${id('lecturer')}`, {
      method: 'PATCH',
      token: owner,
      json: { name: 'Giảng viên chính' },
    });
    expect(patch.status).toBe(409);
    expect(apiErrorSchema.parse(await patch.json()).error.message).toBe(
      'Không thể sửa vai trò hệ thống',
    );
    const lecturer = await t.prisma.db.adminRole.findUniqueOrThrow({
      where: { key: 'lecturer' },
      select: { name: true },
    });
    expect(lecturer.name).toBe('Giảng viên');
  });

  it('REQ-324 tạo vai trò tự tạo, tên trùng 409', async () => {
    const name = `Thử ${randomUUID().slice(0, 6)}`;
    const r = await post({ name, description: 'Hỗ trợ sự kiện' });
    expect(r.status).toBe(201);
    const role = adminRoleSchema.parse(await r.json());
    expect(role).toMatchObject({
      key: null,
      name,
      description: 'Hỗ trợ sự kiện',
      isSystem: false,
      accountCount: 0,
      permissions: [],
    });
    const audit = await t.prisma.db.auditLog.findFirst({
      where: { action: 'roles.create', entityId: role.id },
      select: { tag: true },
    });
    expect(audit?.tag).toBe('permission');
    const dup = await post({ name: name.toUpperCase() });
    expect(dup.status).toBe(409);
    expect(apiErrorSchema.parse(await dup.json()).error.fields).toEqual([
      { path: 'name', message: 'Tên vai trò đã tồn tại' },
    ]);
    // Trùng tên vai trò hệ thống (citext) cũng 409
    expect((await post({ name: 'kế toán' })).status).toBe(409);
    const renamed = `${name} B`;
    const ok = await t.call(`/admin/admin-roles/${role.id}`, {
      method: 'PATCH',
      token: owner,
      json: { name: renamed },
    });
    expect(ok.status).toBe(200);
    expect(adminRoleSchema.parse(await ok.json()).name).toBe(renamed);
  });

  it('REQ-228 PUT ma trận ghi Redis ngay', async () => {
    const state = t.app.get(AuthStateService);
    const lecturerId = id('lecturer');
    await resetMatrix();
    await t.app.get(RoleGrantsService).reloadAll();
    expect(await state.adminGrants(lecturerId)).toContain('members.view');
    const before = await t.prisma.db.adminUser.aggregate({ _sum: { permVersion: true } });
    const next = DEFAULT_ADMIN_ROLE_PERMISSIONS.lecturer.filter((k) => k !== 'members.view');
    const r = await put({ [lecturerId]: next });
    expect(r.status).toBe(200);
    const body = adminRoleListSchema.parse(await r.json());
    expect(body.items.find((i) => i.id === lecturerId)?.permissions).not.toContain('members.view');
    const cached = await state.adminGrants(lecturerId);
    expect([...(cached ?? [])].sort()).toEqual([...next].sort());
    const rows = await t.prisma.db.adminRolePermission.findMany({
      where: { roleId: lecturerId },
      select: { permissionKey: true },
    });
    expect(rows.map((x) => x.permissionKey).sort()).toEqual([...next].sort());
    // Không tăng perm_version (quyền áp ngay, không bắt đăng nhập lại)
    const after = await t.prisma.db.adminUser.aggregate({ _sum: { permVersion: true } });
    expect(after._sum.permVersion).toBe(before._sum.permVersion);
    const audit = await t.prisma.db.auditLog.findFirst({
      where: { action: 'roles.permissions' },
      orderBy: { createdAt: 'desc' },
      select: { tag: true, summary: true },
    });
    expect(audit).toEqual({ tag: 'permission', summary: 'cập nhật phân quyền Giảng viên' });
  });

  it('REQ-228 chạm Super Admin 409', async () => {
    await resetMatrix();
    const before = await t.prisma.db.adminRolePermission.count();
    const r = await put({ [id('super_admin')]: ['overview.view'], [id('lecturer')]: [] });
    expect(r.status).toBe(409);
    expect(apiErrorSchema.parse(await r.json()).error.message).toBe(
      'Không thể chỉnh quyền Super Admin',
    );
    expect(await t.prisma.db.adminRolePermission.count()).toBe(before);
    expect(
      await t.prisma.db.adminRolePermission.count({ where: { roleId: id('super_admin') } }),
    ).toBe(0);
    // Khoá ngoài 25 khoá → 400
    expect((await put({ [id('lecturer')]: ['m.view'] })).status).toBe(400);
  });

  it('REQ-324 thiếu settings.admins → 403', async () => {
    const adm = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    expect((await t.call('/admin/admin-roles', { token: adm })).status).toBe(403);
    expect((await put({ [id('lecturer')]: [] }, adm)).status).toBe(403);
    expect((await post({ name: 'Thử không quyền' }, adm)).status).toBe(403);
    const patch = await t.call(`/admin/admin-roles/${id('lecturer')}`, {
      method: 'PATCH',
      token: adm,
      json: { description: 'x' },
    });
    expect(patch.status).toBe(403);
  });

  it('AT-RB05 xoá vai trò đang dùng 409', async () => {
    const r = adminRoleSchema.parse(
      await (await post({ name: `Thử xoá ${randomUUID().slice(0, 6)}` })).json(),
    );
    const a = await createUser(t, { systemRole: 'admin' });
    const role = (roleId: string) =>
      t.call(`/admin/admin-accounts/${a.id}/role`, {
        method: 'PATCH',
        token: owner,
        json: { roleId },
      });
    expect((await role(r.id)).status).toBe(200);
    const del = () => t.call(`/admin/admin-roles/${r.id}`, { method: 'DELETE', token: owner });
    const busy = await del();
    expect(busy.status).toBe(409);
    expect(apiErrorSchema.parse(await busy.json()).error.message).toBe(
      'Vai trò đang có 1 tài khoản, hãy đổi vai trò các tài khoản trước',
    );
    expect((await role(id('lecturer'))).status).toBe(200);
    const ok = await del();
    expect(ok.status).toBe(200);
    expect(await t.prisma.db.adminRole.count({ where: { id: r.id } })).toBe(0);
    expect(await t.app.get(AuthStateService).adminGrants(r.id)).toBeNull();
    expect(
      await t.prisma.db.auditLog.count({
        where: { action: 'roles.delete', entityId: r.id, tag: 'permission' },
      }),
    ).toBe(1);
    expect((await del()).status).toBe(404);
  });

  it('REQ-324 xoá vai trò hệ thống 409', async () => {
    for (const key of ['super_admin', 'admin', 'lecturer', 'accountant', 'editor']) {
      const r = await t.call(`/admin/admin-roles/${id(key)}`, { method: 'DELETE', token: owner });
      expect(r.status).toBe(409);
      expect(apiErrorSchema.parse(await r.json()).error.message).toBe(
        'Không xoá được vai trò hệ thống',
      );
    }
    const adm = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    expect(
      (await t.call(`/admin/admin-roles/${id('editor')}`, { method: 'DELETE', token: adm })).status,
    ).toBe(403);
  });
});
