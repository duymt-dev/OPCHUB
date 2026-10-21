import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { adminRoleListSchema } from '@opchub/shared/api-domains';
import { createUser, flushAuthState } from '../factories/user.factory';
import { tokenOf } from '../factories/group.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('TIP-V2-505 REQ-324 large permission matrix audit', () => {
  let t: TestApp;
  const prefix = `Audit ${randomUUID()}`;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.prisma.db.adminRole.deleteMany({ where: { name: { startsWith: prefix } } });
    await t.close();
  });

  it('accepts the 50-role boundary with long captions without losing the complete audited permission matrix', async () => {
    await flushAuthState(t);
    const owner = await createUser(t, { systemRole: 'super_admin' });
    const token = await tokenOf(t, owner);
    const roles = await t.prisma.db.adminRole.createManyAndReturn({
      data: Array.from({ length: 50 }, (_, i) => ({
        name: `${prefix} role ${i}`,
        isSystem: false,
      })),
      select: { id: true },
    });
    const matrix = Object.fromEntries(roles.map((role) => [role.id, ['bots.view']]));
    const tooMany = {
      ...matrix,
      ...Object.fromEntries(
        Array.from({ length: 10 }, (_, i) => [`over-limit-${i}`, ['bots.view']]),
      ),
    };
    const invalid = await t.call('/admin/admin-roles/permissions', {
      method: 'PUT',
      token,
      json: tooMany,
    });
    expect(invalid.status).toBe(400);
    expect(
      await t.prisma.db.adminRolePermission.count({
        where: { roleId: { in: roles.map((role) => role.id) } },
      }),
    ).toBe(0);
    const response = await t.call('/admin/admin-roles/permissions', {
      method: 'PUT',
      token,
      json: matrix,
    });
    const raw: unknown = await response.json();
    expect(response.status, JSON.stringify(raw)).toBe(200);
    const body = adminRoleListSchema.parse(raw);
    for (const role of roles)
      expect(body.items.find((row) => row.id === role.id)?.permissions).toEqual(['bots.view']);
    const audit = await t.prisma.db.auditLog.findFirstOrThrow({
      where: { actorId: owner.id, action: 'roles.permissions' },
      select: { summary: true, diff: true },
    });
    expect(audit.summary).toHaveLength(500);
    expect(audit.summary).toContain('(50 vai trò)');
    expect(audit.diff).toEqual(matrix);
    expect(
      await t.prisma.db.adminRolePermission.count({
        where: { roleId: { in: roles.map((role) => role.id) } },
      }),
    ).toBe(50);
  });
});
