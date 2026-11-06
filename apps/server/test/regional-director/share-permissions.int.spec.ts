import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../setup/test-app';
import { createUser, flushAuthState } from '../factories/user.factory';
import { tokenOf } from '../factories/group.factory';
import { regionalShareFixture } from '../factories/regional-share.factory';
describe('TIP-V46-802 share permissions', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
  });
  afterAll(() => t.close());
  it.each(['accountant', 'admin', 'lecturer', 'editor', 'super_admin'])(
    '%s enforces all four routes',
    async (key) => {
      const f = await regionalShareFixture(t);
      await f.ledger.record(f.input);
      const actor = await createUser(t, { systemRole: 'admin' });
      const role = await t.prisma.db.adminRole.findUniqueOrThrow({ where: { key } });
      await t.prisma.db.adminUser.update({ where: { id: actor.id }, data: { roleId: role.id } });
      const token = await tokenOf(t, actor);
      const view = ['accountant', 'admin', 'super_admin'].includes(key);
      const pay = ['accountant', 'super_admin'].includes(key);
      for (const path of [
        '/admin/gdv/shares',
        '/admin/gdv/north/shares',
        '/admin/gdv/north/payouts',
      ])
        expect((await t.call(path, { token })).status).toBe(view ? 200 : 403);
      const response = await t.call('/admin/gdv/north/payouts', {
        token,
        method: 'POST',
        json: { directorUserId: f.director.id },
        headers: { 'Idempotency-Key': randomUUID() },
      });
      expect(response.status).toBe(pay ? 200 : 403);
    },
  );
  it('missing key and invalid policy are 422, with policy field mapping', async () => {
    const f = await regionalShareFixture(t);
    const token = await tokenOf(t, f.actor);
    expect(
      (
        await t.call('/admin/gdv/north/payouts', {
          token,
          method: 'POST',
          json: { directorUserId: f.director.id },
        })
      ).status,
    ).toBe(422);
    const response = await t.call('/admin/affiliate/policy', {
      token,
      method: 'PUT',
      json: {
        defaultRate: 20,
        cookieDays: 30,
        fundraisingRate: 10,
        terms: '',
        regionalFirstYear: 30,
        regionalStep: 10,
        regionalMin: 40,
      },
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: { fields: [{ path: 'regionalMin' }] } });
  });
});
