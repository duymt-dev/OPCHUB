import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_APP_NOTIFY } from '@opchub/shared/api-domains';
import { StoreDigestService } from '@/modules/local-business';
import { createUser } from '../factories/user.factory';
import { clearPushFixtures, pushTestApp, setPushSettings } from '../notification/push-test.helpers';

describe('D-137 daily store digest', () => {
  let f: Awaited<ReturnType<typeof pushTestApp>>;
  const users: string[] = [],
    day = '2086-08-16';
  beforeAll(async () => {
    f = await pushTestApp();
  });
  afterAll(async () => {
    if (!f) return;
    await clearPushFixtures(f.t, users);
    await f.t.prisma.db.storeDigestRun.deleteMany({ where: { day: new Date(day) } });
    await f.t.prisma.db.user.deleteMany({ where: { id: { in: users } } });
    await setPushSettings(f.t, f.previous);
    await f.t.close();
  });
  async function store(views: number, expired = false, hidden = false) {
    const u = await createUser(f.t, {
      accountType: 'business',
      fee: expired ? 'expired' : 'active',
    });
    users.push(u.id);
    const s = await f.t.prisma.db.store.create({
      data: {
        ownerId: u.id,
        name: '816 digest fixture',
        status: hidden ? 'hidden' : 'published',
        hiddenPrev: hidden ? 'published' : null,
      },
    });
    await f.t.prisma.db.storeDailyView.create({
      data: { storeId: s.id, day: new Date(day), views },
    });
    return u.id;
  }
  it('store digest sends positive yesterday views once, skips zero hidden expired and disabled kind', async () => {
    const owner = await store(7);
    await store(0);
    await store(12, true);
    await store(5, false, true);
    const svc = f.t.app.get(StoreDigestService);
    expect(await svc.run(day)).toBe(0);
    expect(
      await f.t.prisma.db.storeDigestRun.findUnique({ where: { day: new Date(day) } }),
    ).toBeNull();
    await setPushSettings(f.t, {
      ...DEFAULT_APP_NOTIFY,
      push: { ...DEFAULT_APP_NOTIFY.push, store: true },
    });
    expect(await svc.run(day)).toBe(1);
    expect(await svc.run(day)).toBe(0);
    expect(
      await f.t.prisma.db.notification.findMany({
        where: { userId: { in: users } },
        select: { userId: true, title: true, body: true, link: true },
      }),
    ).toEqual([
      { userId: owner, title: 'Gian hàng hôm qua', body: '7 lượt xem', link: '/stores/mine' },
    ]);
    expect(
      (await f.t.prisma.db.storeDigestRun.findUniqueOrThrow({ where: { day: new Date(day) } }))
        .completedAt,
    ).not.toBeNull();
  });
});
