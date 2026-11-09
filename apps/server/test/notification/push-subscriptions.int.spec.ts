import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_APP_NOTIFY, pushPublicConfigSchema } from '@opchub/shared/api-domains';
import { PushSubscriptionRepository } from '@/modules/notification';
import { createUser, flushAuthState } from '../factories/user.factory';
import { tokenOf } from '../factories/group.factory';
import { clearPushFixtures, device, pushTestApp, setPushSettings } from './push-test.helpers';

describe('D-137 authenticated device subscriptions', () => {
  let f: Awaited<ReturnType<typeof pushTestApp>>;
  const users: string[] = [];
  beforeAll(async () => {
    f = await pushTestApp();
  });
  beforeEach(async () => {
    await flushAuthState(f.t);
  });
  afterAll(async () => {
    if (!f) return;
    await clearPushFixtures(f.t, users);
    await setPushSettings(f.t, f.previous);
    await f.t.close();
  });
  const member = async () => {
    const u = await createUser(f.t, { fee: 'pending_payment' });
    users.push(u.id);
    return { u, token: await tokenOf(f.t, u) };
  };
  it('subscribe upsert cap and pwa off', async () => {
    const { u, token } = await member();
    const input = device(randomUUID());
    const post = (json = input) => f.t.call('/push/subscriptions', { method: 'POST', token, json });
    expect((await post()).status).toBe(201);
    expect((await post()).status).toBe(201);
    expect(await f.t.prisma.db.pushSubscription.count({ where: { userId: u.id } })).toBe(1);
    const additions = Array.from({ length: 10 }, () => device(randomUUID()));
    // API calls are sequential gestures, not database queries in production loops.
    for (const item of additions) expect((await post(item)).status).toBe(201);
    expect(
      await f.t.prisma.db.pushSubscription.count({ where: { userId: u.id, realm: 'member' } }),
    ).toBe(10);
    expect(
      await f.t.prisma.db.pushSubscription.findUnique({ where: { endpoint: input.endpoint } }),
    ).toBeNull();
    await setPushSettings(f.t, { ...DEFAULT_APP_NOTIFY, pwa: false });
    expect((await post()).status).toBe(409);
    expect(
      pushPublicConfigSchema.parse(await (await f.t.call('/push/config', { token })).json())
        .enabled,
    ).toBe(false);
    await setPushSettings(f.t, DEFAULT_APP_NOTIFY);
  });
  it('requires auth, rejects ownership injection and malformed endpoint/keys', async () => {
    expect((await f.t.call('/push/config')).status).toBe(401);
    const { token } = await member();
    for (const body of [
      { ...device('bad'), userId: 'another' },
      { ...device('bad'), endpoint: 'http://example.invalid/device' },
      { ...device('bad'), keys: { p256dh: 'bad+key=', auth: '' } },
    ]) {
      const r = await f.t.call('/push/subscriptions', { method: 'POST', token, json: body });
      expect(r.status).toBe(400);
      expect(await r.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    }
  });
  it('transfers endpoint ownership and never deletes another account device', async () => {
    const a = await member(),
      b = await member(),
      input = device(randomUUID());
    for (const token of [a.token, b.token])
      expect(
        (
          await f.t.call('/push/subscriptions', {
            method: 'POST',
            token,
            json: input,
          })
        ).status,
      ).toBe(201);
    expect(
      (
        await f.t.call('/push/subscriptions', {
          method: 'DELETE',
          token: a.token,
          json: { endpoint: input.endpoint },
        })
      ).status,
    ).toBe(200);
    expect(
      await f.t.prisma.db.pushSubscription.findUnique({
        where: { endpoint: input.endpoint },
        select: { userId: true, realm: true },
      }),
    ).toEqual({ userId: b.u.id, realm: 'member' });
    expect(
      (
        await f.t.call('/push/subscriptions', {
          method: 'DELETE',
          token: b.token,
          json: { endpoint: input.endpoint },
        })
      ).status,
    ).toBe(200);
    expect(
      await f.t.prisma.db.pushSubscription.findUnique({ where: { endpoint: input.endpoint } }),
    ).toBeNull();
  });
  it('persists five member preferences, returns admin flags and forbids admin preferences', async () => {
    const { token } = await member();
    expect(await (await f.t.call('/push/preferences', { token })).json()).toEqual(
      DEFAULT_APP_NOTIFY.push,
    );
    const kinds = { ...DEFAULT_APP_NOTIFY.push, event: false };
    expect(
      (await f.t.call('/push/preferences', { method: 'PUT', token, json: kinds })).status,
    ).toBe(200);
    expect(await (await f.t.call('/push/preferences', { token })).json()).toEqual(kinds);
    expect(
      pushPublicConfigSchema.parse(await (await f.t.call('/push/config', { token })).json()).kinds,
    ).toEqual(DEFAULT_APP_NOTIFY.push);
    const admin = await createUser(f.t, { adminPermissions: ['settings.general'] });
    users.push(admin.id);
    expect((await f.t.call('/push/preferences', { token: await tokenOf(f.t, admin) })).status).toBe(
      403,
    );
  });
  it('purges only inactive devices older than 90 days in bounded batches', async () => {
    const { u, token } = await member();
    const input = device(randomUUID());
    await f.t.call('/push/subscriptions', { method: 'POST', token, json: input });
    const now = new Date();
    await f.t.prisma.db.pushSubscription.update({
      where: { endpoint: input.endpoint },
      data: { createdAt: new Date(now.getTime() - 91 * 86400000), lastSuccessAt: new Date() },
    });
    await f.t.app.get(PushSubscriptionRepository).purge(now);
    expect(await f.t.prisma.db.pushSubscription.count({ where: { userId: u.id } })).toBe(1);
    await f.t.prisma.db.pushSubscription.update({
      where: { endpoint: input.endpoint },
      data: { lastSuccessAt: null },
    });
    await f.t.app.get(PushSubscriptionRepository).purge(now);
    expect(await f.t.prisma.db.pushSubscription.count({ where: { userId: u.id } })).toBe(0);
  });
});
