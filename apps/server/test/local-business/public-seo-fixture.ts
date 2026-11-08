import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { createUser, flushAuthState } from '../factories/user.factory';
import { tokenOf } from '../factories/group.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { StorePublicService } from '@/modules/local-business/services/store-public.service';

export function publicSeoFixture(options?: Parameters<typeof createTestApp>[0]) {
  let t: TestApp, ownerId: string, storeId: string, token: string;
  const slug = `seo-820-${randomUUID()}`,
    users: string[] = [];
  beforeAll(async () => {
    t = await createTestApp(options);
    const owner = await createUser(t, { accountType: 'business', fee: 'active' });
    ownerId = owner.id;
    users.push(ownerId);
    token = await tokenOf(t, owner);
    storeId = (
      await t.prisma.db.store.create({
        data: {
          ownerId,
          slug,
          name: 'TIP820 public fixture',
          status: 'published',
          seoIndex: true,
        },
        select: { id: true },
      })
    ).id;
  });
  beforeEach(async () => {
    await flushAuthState(t);
    await t.prisma.db.user.update({
      where: { id: ownerId },
      data: { status: 'active', deletedAt: null },
    });
    await t.prisma.db.store.update({
      where: { id: storeId },
      data: { status: 'published', hiddenPrev: null, seoIndex: true },
    });
    await t.prisma.db.membershipFee.update({
      where: { userId: ownerId },
      data: { status: 'active', validUntil: new Date(Date.now() + 86_400_000) },
    });
    await t.prisma.db.storeDailyGuestView.deleteMany({ where: { storeId } });
    await t.app.get(StorePublicService).invalidate(slug);
  });
  afterAll(async () => {
    if (!t) return;
    try {
      await t.app.get(StorePublicService).invalidate(slug);
      await t.prisma.db.user.deleteMany({ where: { id: { in: users } } });
    } finally {
      await t.close();
    }
  });
  return {
    get t() {
      return t;
    },
    get ownerId() {
      return ownerId;
    },
    get storeId() {
      return storeId;
    },
    get token() {
      return token;
    },
    slug,
    users,
  };
}
