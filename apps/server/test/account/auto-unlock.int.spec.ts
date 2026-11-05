import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AccountLockService, AdminUsersService } from '@/modules/account';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('REQ-622 BR-465 auto unlock audit and refresh', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
  });
  afterAll(async () => {
    await t.close();
  });
  const events = (userId: string) =>
    t.prisma.db.outboxEvent.count({
      where: { type: 'user.unlocked', payload: { path: ['userId'], equals: userId } },
    });
  const audits = (id: string) =>
    t.prisma.db.auditLog.findMany({
      where: { action: 'user.unlock', entityId: id },
      select: { actorId: true },
    });

  it('login opens expired lock once with system audit and outbox, revoked pre-lock refresh stays401', async () => {
    const user = await createUser(t, { fee: 'active' });
    const login = () =>
      t.call('/auth/login', {
        method: 'POST',
        json: { identifier: user.email, password: user.password },
      });
    const original = await login();
    expect(original.status).toBe(200);
    const cookie = original.headers
      .getSetCookie()
      .find((c) => c.startsWith('opchub_rt='))
      ?.split(';')[0];
    expect(cookie).toBeTruthy();
    const before = new Date(Date.now() - 2 * 86_400_000);
    await t.app
      .get(AdminUsersService)
      .setStatus(
        { id: 'auto-unlock-fixture-admin', ip: null },
        [user.id],
        'locked',
        'auto-unlock fixture',
        before,
        1,
      );
    expect((await login()).status).toBe(200);
    expect(
      await t.prisma.db.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { status: true, lockKind: true },
      }),
    ).toEqual({ status: 'active', lockKind: null });
    expect(await audits(user.id)).toEqual([{ actorId: null }]);
    expect(await events(user.id)).toBe(1);
    const refresh = await t.call('/auth/refresh', {
      method: 'POST',
      headers: { Cookie: cookie ?? '', Origin: 'http://localhost:3000' },
    });
    expect(refresh.status).toBe(401);
    expect((await login()).status).toBe(200);
    expect(await audits(user.id)).toHaveLength(1);
    expect(await events(user.id)).toBe(1);
  });

  it('sweep twice opens only expired locks; future manual and indefinite locks remain', async () => {
    const users = await Promise.all(
      Array.from({ length: 4 }, () => createUser(t, { fee: 'active' })),
    );
    const [a, b, c, d] = users;
    if (!a || !b || !c || !d) throw new Error('Missing lock fixtures');
    await t.prisma.db.user.updateMany({
      where: { id: { in: [a.id, b.id] } },
      data: { status: 'locked', lockKind: 'auto', lockedUntil: new Date(Date.now() - 1000) },
    });
    await t.prisma.db.user.update({
      where: { id: c.id },
      data: {
        status: 'locked',
        lockKind: 'manual',
        lockedUntil: new Date(Date.now() + 86_400_000),
      },
    });
    await t.prisma.db.user.update({
      where: { id: d.id },
      data: { status: 'locked', lockKind: 'manual', lockedUntil: null },
    });
    await t.app.get(AccountLockService).sweepExpired();
    await t.app.get(AccountLockService).sweepExpired();
    const states = await t.prisma.db.user.findMany({
      where: { id: { in: users.map((u) => u.id) } },
      select: { id: true, status: true },
    });
    const byId = new Map(states.map((u) => [u.id, u.status]));
    expect([byId.get(a.id), byId.get(b.id), byId.get(c.id), byId.get(d.id)]).toEqual([
      'active',
      'active',
      'locked',
      'locked',
    ]);
    expect(await audits(a.id)).toEqual([{ actorId: null }]);
    expect(await audits(b.id)).toEqual([{ actorId: null }]);
    expect(await events(a.id)).toBe(1);
    expect(await events(b.id)).toBe(1);
    expect(await events(c.id)).toBe(0);
    expect(await events(d.id)).toBe(0);
  });
});
