import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appNotifySettingsSchema, DEFAULT_APP_NOTIFY } from '@opchub/shared/api-domains';
import { AppSettingsService } from '@/modules/settings';
import { tokenOf } from '../factories/group.factory';
import { createUser } from '../factories/user.factory';
import type { TestApp } from '../setup/test-app';
import { PushDispatchService } from '@/modules/notification';
import {
  clearPushFixtures,
  device,
  pushTestApp,
  setPushSettings,
} from '../notification/push-test.helpers';
describe('REQ-629 D-137 app notification configuration and device test', () => {
  let t: TestApp, token: string, denied: string, id: string;
  let previous: unknown;
  let fixture: Awaited<ReturnType<typeof pushTestApp>>;
  const path = '/admin/settings/app';
  beforeAll(async () => {
    fixture = await pushTestApp();
    t = fixture.t;
    previous = fixture.previous;
    await t.prisma.db.appSetting.update({
      where: { key: 'app' },
      data: { value: DEFAULT_APP_NOTIFY },
    });
    await t.app.get(AppSettingsService).invalidate('app');
    const user = await createUser(t, { adminPermissions: ['settings.general'] });
    id = user.id;
    token = await tokenOf(t, user);
    denied = await tokenOf(t, await createUser(t, { adminPermissions: ['settings.log'] }));
  });
  afterAll(async () => {
    if (!t) return;
    await t.prisma.db.appSetting.update({
      where: { key: 'app' },
      data: { value: appNotifySettingsSchema.parse(previous) },
    });
    await t.app.get(AppSettingsService).invalidate('app');
    await clearPushFixtures(t, [id]);
    await t.prisma.db.notification.deleteMany({ where: { userId: id } });
    await t.close();
  });
  it('permissions, strict input/fields and oversized body are enforced at backend', async () => {
    expect((await t.call(path)).status).toBe(401);
    for (const [method, suffix] of [
      ['GET', ''],
      ['PATCH', ''],
      ['POST', '/test'],
    ] as const) {
      expect(
        (
          await t.call(path + suffix, {
            method,
            token: denied,
            ...(method !== 'GET' ? { json: {} } : {}),
          })
        ).status,
      ).toBe(403);
    }
    const bad = await t.call(path, { method: 'PATCH', token, json: { push: { zalo: true } } });
    expect(bad.status).toBe(400);
    const badBody: unknown = await bad.json();
    expect(badBody).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    expect(
      (await t.call(path, { method: 'PATCH', token, json: { unknown: 'x'.repeat(800000) } }))
        .status,
    ).toBe(413);
  });
  it('partial nested save retains other fields, permits all off and writes audit', async () => {
    expect(appNotifySettingsSchema.parse(await (await t.call(path, { token })).json())).toEqual(
      DEFAULT_APP_NOTIFY,
    );
    const save = await t.call(path, {
      method: 'PATCH',
      token,
      json: { pwa: false, push: { msg: false } },
    });
    expect(save.status).toBe(200);
    expect(appNotifySettingsSchema.parse(await save.json())).toEqual({
      ...DEFAULT_APP_NOTIFY,
      pwa: false,
      push: { ...DEFAULT_APP_NOTIFY.push, msg: false },
    });
    expect(
      (
        await t.call(path, {
          method: 'PATCH',
          token,
          json: { push: { msg: false, need: false, renew: false, event: false, store: false } },
        })
      ).status,
    ).toBe(200);
    expect(
      await t.prisma.db.auditLog.count({ where: { actorId: id, action: 'settings.app' } }),
    ).toBe(2);
  });
  it('test creates acting Admin notification audit and high urgency push to admin devices only', async () => {
    await setPushSettings(t, {
      ...DEFAULT_APP_NOTIFY,
      push: { msg: false, need: false, renew: false, event: false, store: false },
    });
    await t.prisma.db.pushSubscription.createMany({
      data: [
        {
          realm: 'admin',
          userId: id,
          endpoint: device(`${id}-admin`).endpoint,
          p256dh: 'test',
          auth: 'test',
        },
        {
          realm: 'member',
          userId: id,
          endpoint: device(`${id}-member`).endpoint,
          p256dh: 'test',
          auth: 'test',
        },
      ],
    });
    const before = await t.prisma.db.outboxEvent.count();
    const response = await t.call(path + '/test', { method: 'POST', token });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, deviceCount: 1 });
    expect(
      await t.prisma.db.notification.findMany({
        where: { userId: id },
        select: { title: true, body: true, type: true },
      }),
    ).toEqual([
      {
        type: 'system',
        title: 'Thông báo thử từ OPC Hub',
        body: 'Thông báo đẩy đang hoạt động trên thiết bị của bạn.',
      },
    ]);
    expect(
      await t.prisma.db.auditLog.count({ where: { actorId: id, action: 'settings.app_test' } }),
    ).toBe(1);
    expect(await t.prisma.db.outboxEvent.count()).toBe(before + 1);
    const note = await t.prisma.db.notification.findFirstOrThrow({
      where: { userId: id },
      select: { id: true },
    });
    await t.app.get(PushDispatchService).send([note.id]);
    expect(fixture.provider.sent).toHaveLength(1);
    expect(fixture.provider.sent[0]?.options.urgency).toBe('high');
    await t.prisma.db.pushSubscription.deleteMany({ where: { realm: 'admin', userId: id } });
    const noDevice = await t.call(path + '/test', { method: 'POST', token });
    expect(await noDevice.json()).toEqual({ ok: true, deviceCount: 0 });
  });
});
