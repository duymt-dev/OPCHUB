import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_NOTIFY } from '@opchub/shared/api-domains';
import { OutboxService } from '@/common/outbox';
import { NotificationService, PushDispatchService } from '@/modules/notification';
import { createUser } from '../factories/user.factory';
import { clearPushFixtures, device, pushTestApp, setPushSettings } from './push-test.helpers';

describe('D-137 durable push dispatch', () => {
  let f: Awaited<ReturnType<typeof pushTestApp>>;
  const users: string[] = [];
  beforeAll(async () => {
    f = await pushTestApp();
  });
  beforeEach(async () => {
    vi.restoreAllMocks();
    f.provider.sent.length = 0;
    await setPushSettings(f.t, DEFAULT_APP_NOTIFY);
  });
  afterAll(async () => {
    if (!f) return;
    vi.restoreAllMocks();
    await clearPushFixtures(f.t, users);
    await setPushSettings(f.t, f.previous);
    await f.t.close();
  });
  async function recipient() {
    const user = await createUser(f.t, { fee: 'active' });
    users.push(user.id);
    await f.t.prisma.db.pushSubscription.createMany({
      data: ['one', 'two'].map((suffix) => ({
        realm: 'member',
        userId: user.id,
        endpoint: device(`${user.id}/${suffix}`).endpoint,
        p256dh: 'test',
        auth: 'test',
      })),
    });
    return user;
  }
  const item = (userId: string, id = randomUUID()) => ({
    id,
    userId,
    type: 'mention' as const,
    push: 'msg' as const,
    title: '0912345678 a@x.vn',
    body: '1.200.000đ ' + 'x'.repeat(140),
    link: '/chat/group',
  });
  const notify = (rows: Parameters<NotificationService['notify']>[0]) =>
    f.t.app.get(NotificationService).notify(rows);
  const send = (ids: string[]) => f.t.app.get(PushDispatchService).send(ids);

  it('mention push respects admin and member switches', async () => {
    const user = await recipient(),
      first = item(user.id);
    await notify([first]);
    await send([first.id]);
    expect(f.provider.sent).toHaveLength(2);
    expect(f.provider.sent[0]?.payload).toMatchObject({
      tag: first.id,
      link: '/chat/group',
      title: '[SĐT] [email]',
    });
    expect(f.provider.sent[0]?.payload.body).toHaveLength(120);
    expect(f.provider.sent[0]?.payload.body).toContain('[số tiền]');
    await setPushSettings(f.t, {
      ...DEFAULT_APP_NOTIFY,
      push: { ...DEFAULT_APP_NOTIFY.push, msg: false },
    });
    const off = item(user.id);
    await notify([off]);
    await send([off.id]);
    expect(f.provider.sent).toHaveLength(2);
    await setPushSettings(f.t, DEFAULT_APP_NOTIFY);
    await f.t.prisma.db.pushPreference.create({
      data: { realm: 'member', userId: user.id, kinds: { ...DEFAULT_APP_NOTIFY.push, msg: false } },
    });
    const memberOff = item(user.id);
    await notify([memberOff]);
    await send([memberOff.id]);
    expect(f.provider.sent).toHaveLength(2);
    expect(await f.t.prisma.db.notification.count({ where: { userId: user.id } })).toBe(3);
  });
  it('outbox replay pushes once, including interleaved notifications and a retained ledger after trim', async () => {
    const user = await recipient(),
      a = item(user.id),
      b = item(user.id);
    await notify([a]);
    await send([a.id]);
    await notify([b]);
    await send([b.id]);
    await notify([a]);
    await send([a.id]);
    expect(f.provider.sent).toHaveLength(4);
    expect(await f.t.prisma.db.notification.count({ where: { userId: user.id } })).toBe(2);
    await f.t.prisma.db.notification.delete({ where: { id: a.id } });
    await notify([a]);
    await send([a.id]);
    expect(f.provider.sent).toHaveLength(4);
    expect(await f.t.prisma.db.notification.findUnique({ where: { id: a.id } })).toBeNull();
    // Keep its ID for scoped teardown of the intentionally retained intent.
    await f.t.prisma.db.outboxEvent.deleteMany({
      where: {
        type: 'push.requested',
        payload: { path: ['notificationIds'], array_contains: [a.id] },
      },
    });
    await f.t.prisma.db.pushDispatch.delete({ where: { notificationId: a.id } });
  });
  it('gone removed and retry once; a successful device is never resent', async () => {
    const user = await recipient(),
      row = item(user.id);
    const seen = new Map<string, number>();
    const deliver = vi.spyOn(f.provider, 'send').mockImplementation((sub) => {
      const n = (seen.get(sub.endpoint) ?? 0) + 1;
      seen.set(sub.endpoint, n);
      return Promise.resolve(
        sub.endpoint.endsWith('/two') && n === 1 ? { retry: true as const } : { ok: true as const },
      );
    });
    await notify([row]);
    await expect(send([row.id])).rejects.toMatchObject({ retryable: true });
    await send([row.id]);
    expect([...seen.values()].sort()).toEqual([1, 2]);
    expect(
      await f.t.prisma.db.pushDelivery.count({
        where: { notificationId: row.id, sentAt: { not: null } },
      }),
    ).toBe(2);
    deliver.mockImplementation((sub) =>
      Promise.resolve(
        sub.endpoint.endsWith('/two') ? { gone: true as const } : { ok: true as const },
      ),
    );
    const gone = item(user.id);
    await notify([gone]);
    await send([gone.id]);
    expect(await f.t.prisma.db.pushSubscription.count({ where: { userId: user.id } })).toBe(1);
  });
  it('renew and event kinds only; untagged activation and registration never create an intent', async () => {
    const user = await recipient();
    const renew = { ...item(user.id), type: 'membership' as const, push: 'renew' as const };
    const event = { ...item(user.id), type: 'event' as const, push: 'event' as const };
    await notify([
      renew,
      event,
      {
        userId: user.id,
        type: 'membership',
        title: 'Đã ghi nhận phí thành viên',
        body: '',
        link: '/dashboard',
      },
      { userId: user.id, type: 'event', title: 'Đã đăng ký', body: '', link: '/events/one' },
    ]);
    const ids = await f.t.prisma.db.notification.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    await send(ids.map((r) => r.id));
    expect(f.provider.sent).toHaveLength(4);
    expect(
      await f.t.prisma.db.pushDispatch.count({
        where: { notificationId: { in: ids.map((r) => r.id) } },
      }),
    ).toBe(2);
  });
  it('notification, intent and enqueue outbox roll back atomically', async () => {
    const user = await recipient(),
      row = item(user.id);
    vi.spyOn(f.t.app.get(OutboxService), 'addMany').mockRejectedValueOnce(
      new Error('injected persistence failure'),
    );
    await expect(notify([row])).rejects.toThrow('injected persistence failure');
    expect(await f.t.prisma.db.notification.findUnique({ where: { id: row.id } })).toBeNull();
    expect(
      await f.t.prisma.db.pushDispatch.findUnique({ where: { notificationId: row.id } }),
    ).toBeNull();
  });
  it('PWA off and no-device users retain in-app notifications without sending', async () => {
    const user = await recipient(),
      row = item(user.id);
    await setPushSettings(f.t, { ...DEFAULT_APP_NOTIFY, pwa: false });
    await notify([row]);
    await send([row.id]);
    expect(f.provider.sent).toHaveLength(0);
    expect(await f.t.prisma.db.notification.findUnique({ where: { id: row.id } })).not.toBeNull();
    await setPushSettings(f.t, DEFAULT_APP_NOTIFY);
    await f.t.prisma.db.pushSubscription.deleteMany({ where: { userId: user.id } });
    const none = item(user.id);
    await notify([none]);
    await expect(send([none.id])).resolves.toBeUndefined();
  });
});
