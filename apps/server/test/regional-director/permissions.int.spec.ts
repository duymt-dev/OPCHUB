import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUser, flushAuthState } from '../factories/user.factory';
import { tokenOf } from '../factories/group.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { apiErrorSchema } from '@opchub/shared/api';

describe('AT-GDV03 system role matrix', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
  });
  afterAll(() => t.close());

  it.each(['accountant', 'lecturer', 'editor', 'admin', 'super_admin'])(
    '%s enforces all three write routes and audits only authorized writes',
    async (key) => {
      const actor = await createUser(t, { systemRole: 'admin' });
      const role = await t.prisma.db.adminRole.findUniqueOrThrow({ where: { key } });
      await t.prisma.db.adminUser.update({ where: { id: actor.id }, data: { roleId: role.id } });
      const token = await tokenOf(t, actor);
      const user = await createUser(t, { fee: 'trial' });
      await t.prisma.db.regionalDirector.updateMany({ data: { userId: null } });
      const before = await t.prisma.db.auditLog.count({ where: { actorId: actor.id } });
      const allowed = key === 'admin' || key === 'super_admin';
      for (const [path, method, json] of [
        ['/admin/gdv', 'POST', { region: 'south', userId: user.id }],
        ['/admin/gdv/south', 'PATCH', { provinces: [] }],
        ['/admin/gdv/south', 'DELETE', undefined],
      ] as const) {
        const response = await t.call(path, { token, method, ...(json ? { json } : {}) });
        expect(response.status).toBe(allowed ? 200 : 403);
        if (!allowed) {
          const permissions = await t.prisma.db.adminRolePermission.findMany({
            where: { roleId: role.id },
          });
          const view = permissions.some((p) => p.permissionKey === 'affiliate.view');
          expect(apiErrorSchema.parse(await response.json()).error).toMatchObject({
            code: view ? 'VIEW_ONLY' : 'FORBIDDEN',
            message: `Vai trò ${role.name} không có quyền bổ nhiệm / thu hồi GĐ Vùng`,
          });
        }
      }
      expect(await t.prisma.db.auditLog.count({ where: { actorId: actor.id } })).toBe(
        before + (allowed ? 3 : 0),
      );
    },
  );
});
