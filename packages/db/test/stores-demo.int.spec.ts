import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../src/client';
import { assertDemoDatabase } from '../seed/demo/guard';
import { seedDemo } from '../seed/demo/index';
import { testEnv } from './env';

/** TIP-V4-608: gian hàng demo — mặc định chỉ st1 (M1); `--stores` thêm 16 chủ DN mẫu, idempotent */
const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 2 });

describe('seed demo gian hàng (TIP-V4-608)', () => {
  beforeAll(() => assertDemoDatabase(testEnv.TEST_DATABASE_URL));
  afterAll(async () => {
    await seedDemo(db);
    await db.$disconnect();
  }, 120_000);

  it('mặc định: chỉ gian hàng st1 của M1, không thêm user', async () => {
    await seedDemo(db);
    const rows = await db.store.findMany({ select: { id: true, ownerId: true, status: true } });
    expect(rows).toEqual([{ id: 'st1', ownerId: 'm1', status: 'published' }]);
    expect(await db.user.count({ where: { id: { startsWith: 'st-owner-' } } })).toBe(0);
    expect(await db.storeItem.count({ where: { storeId: 'st1' } })).toBe(3);
  }, 120_000);

  it('--stores: 17 gian hàng xuất bản, chủ DN còn hạn phí, chạy lại không nhân đôi', async () => {
    await seedDemo(db, { stores: true });
    await seedDemo(db, { stores: true });
    expect(await db.store.count({ where: { status: 'published' } })).toBe(17);
    const visible = await db.store.count({
      where: {
        status: 'published',
        owner: {
          deletedAt: null,
          accountType: 'business',
          membershipFee: { status: 'active', validUntil: { gt: new Date('2026-10-24T00:00:00Z') } },
        },
      },
    });
    expect(visible).toBe(17);
    const st1 = await db.store.findUniqueOrThrow({ where: { id: 'st1' } });
    expect(st1).toMatchObject({ itemCount: 3, hasProduct: true, hasService: true });
  }, 240_000);
});
