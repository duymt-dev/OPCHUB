import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NeedMatchNotifyHandler } from '@/modules/local-business';
import { OutboxService } from '@/common/outbox';
import { createUser } from '../factories/user.factory';
import { clearPushFixtures, pushTestApp, setPushSettings } from '../notification/push-test.helpers';

describe('D-137 matching need notification source', () => {
  let f: Awaited<ReturnType<typeof pushTestApp>>;
  const users: string[] = [],
    needs: string[] = [];
  const field = `816-field-${randomUUID()}`,
    province = `816-province-${randomUUID()}`;
  beforeAll(async () => {
    f = await pushTestApp();
  });
  afterAll(async () => {
    if (!f) return;
    vi.restoreAllMocks();
    await clearPushFixtures(f.t, users);
    await f.t.prisma.db.needMatchNotification.deleteMany({ where: { needId: { in: needs } } });
    await f.t.prisma.db.user.deleteMany({ where: { id: { in: users } } });
    await setPushSettings(f.t, f.previous);
    await f.t.close();
  });
  async function business(matches = true, expired = false) {
    const u = await createUser(f.t, {
      accountType: 'business',
      fee: expired ? 'expired' : 'active',
    });
    users.push(u.id);
    const store = await f.t.prisma.db.store.create({
      data: {
        ownerId: u.id,
        name: '816 isolated store',
        status: 'published',
        field: matches ? field : 'different',
        province: matches ? province : 'different',
      },
    });
    return { u, store };
  }
  it('need published notifies matching store owners once; excludes owner, nonmatches and expired fees', async () => {
    const a = await business(),
      b = await business(false),
      c = await business(),
      expired = await business(true, true);
    const need = await f.t.prisma.db.need.create({
      data: {
        ownerId: c.u.id,
        storeId: c.store.id,
        type: 'buy',
        title: 'A new need',
        description: '',
        phone: '0912345678',
        field,
        province,
      },
    });
    needs.push(need.id);
    await f.t.redis.client.set(`need-matches:${a.u.id}`, 'stale');
    const handler = f.t.app.get(NeedMatchNotifyHandler);
    await handler.published({ needId: need.id });
    await handler.published({ needId: need.id });
    const notifications = await f.t.prisma.db.notification.findMany({
      where: { userId: { in: users } },
      select: { userId: true, title: true, body: true, link: true },
    });
    expect(notifications).toEqual([
      {
        userId: a.u.id,
        title: 'Nhu cầu phù hợp với gian hàng của bạn',
        body: `A new need · ${province}`,
        link: '/needs',
      },
    ]);
    expect(notifications.some((n) => [b.u.id, c.u.id, expired.u.id].includes(n.userId))).toBe(
      false,
    );
    expect(await f.t.redis.client.get(`need-matches:${a.u.id}`)).toBeNull();
    expect(await f.t.prisma.db.needMatchNotification.count({ where: { needId: need.id } })).toBe(1);
  });
  it('rolls back recipient claim together with notification and push intent on persistence failure', async () => {
    const c = await business(),
      need = await f.t.prisma.db.need.create({
        data: {
          ownerId: c.u.id,
          storeId: c.store.id,
          type: 'sell',
          title: 'Atomic claim',
          description: '',
          phone: '0912345678',
          field,
          province,
        },
      });
    needs.push(need.id);
    vi.spyOn(f.t.app.get(OutboxService), 'addMany').mockRejectedValueOnce(
      new Error('injected push outbox failure'),
    );
    await expect(
      f.t.app.get(NeedMatchNotifyHandler).published({ needId: need.id }),
    ).rejects.toThrow('injected');
    expect(await f.t.prisma.db.needMatchNotification.count({ where: { needId: need.id } })).toBe(0);
    vi.restoreAllMocks();
    await f.t.app.get(NeedMatchNotifyHandler).published({ needId: need.id });
    expect(
      await f.t.prisma.db.needMatchNotification.count({ where: { needId: need.id } }),
    ).toBeGreaterThan(0);
  });
});
