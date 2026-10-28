import { createPrismaClient, type DbClient, Prisma } from '@opchub/db';
import { storeDashboardSchema } from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadEnv } from '@/common/config';
import { StoreAutoCreateHandler } from '@/modules/local-business';
import { storeViewDaysQuery } from '@/modules/local-business/repositories/store-views.query';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const vnDay = (ms: number) => new Date(ms + 7 * 3_600_000).toISOString().slice(0, 10);

/**
 * TIP-V42-710 (D-114 S6): Dashboard "Gian hàng của tôi" chỉ số thật — lượt xem 7 ngày theo ngày giờ VN
 * (người khác chủ mở chi tiết), so 7 ngày trước, nhu cầu đang mở.
 */
describe('Dashboard gian hàng (TIP-V42-710)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(() => flushAuthState(t));
  afterAll(async () => {
    await t.prisma.db.store.deleteMany({
      where: { owner: { email: { endsWith: '@test.opchub.vn' } } },
    });
    await t.close();
  });

  it('lượt xem chi tiết của người khác cộng vào ngày hôm nay; chủ xem không tính; 7 ngày trước để so', async () => {
    const u = await createUser(t, { accountType: 'business', fee: 'active' });
    await t.app
      .get(StoreAutoCreateHandler)
      .onTrialStarted({ userId: u.id, accountType: 'business' });
    const token = await tokenOf(t, u);
    const s = await t.prisma.db.store.findUniqueOrThrow({ where: { ownerId: u.id } });
    // Nháp: người khác không mở được → chỉ chủ xem (không tính); đưa lên hiển thị để đo lượt người khác
    await t.prisma.db.store.update({ where: { id: s.id }, data: { status: 'published' } });
    const viewer = await tokenOf(t, await createUser(t, { fee: 'active' }));
    await t.call(`/stores/${s.id}`, { token });
    await t.call(`/stores/${s.id}`, { token: viewer });
    await t.call(`/stores/${s.id}`, { token: viewer });
    const tenDaysAgo = new Date(`${vnDay(Date.now() - 10 * 86_400_000)}T00:00:00Z`);
    await t.prisma.db.storeDailyView.create({ data: { storeId: s.id, day: tenDaysAgo, views: 5 } });

    const res = await t.call('/me/store/dashboard', { token });
    expect(res.status).toBe(200);
    const d = storeDashboardSchema.parse(await res.json());
    expect(d.days).toHaveLength(7);
    expect(d.days.at(-1)).toEqual({ day: vnDay(Date.now()), views: 2 });
    expect(d).toMatchObject({ views7: 2, viewsPrev7: 5, openNeeds: 0 });
    const row = await t.prisma.db.store.findUniqueOrThrow({ where: { id: s.id } });
    expect(row.viewCount).toBe(2);

    const per = await tokenOf(t, await createUser(t, { fee: 'active' }));
    expect((await t.call('/me/store/dashboard', { token: per })).status).toBe(403);
  });
});

describe('Dashboard gian hàng — EXPLAIN lượt xem theo ngày (TIP-V42-710)', () => {
  let db: DbClient;
  beforeAll(async () => {
    db = createPrismaClient(loadEnv().DATABASE_URL, { max: 1 });
    await db.$executeRaw`CREATE TEMP TABLE store_daily_views (LIKE public.store_daily_views INCLUDING ALL)`;
  });
  afterAll(async () => {
    await db.$executeRaw`DROP TABLE IF EXISTS pg_temp.store_daily_views`;
    await db.$disconnect();
  });

  it('10000 gian hàng × 30 ngày (300000 dòng): 14 ngày của 1 gian hàng dùng PK, không Seq Scan', async () => {
    const p = `sdv-${randomUUID()}-`;
    await db.$executeRaw`
      INSERT INTO store_daily_views (store_id, day, views)
      SELECT ${p} || s, current_date - d, (s + d) % 17
      FROM generate_series(0, 9999) s, generate_series(0, 29) d`;
    await db.$executeRaw`VACUUM (ANALYZE) store_daily_views`;
    const to = vnDay(Date.now());
    const from = vnDay(Date.now() - 13 * 86_400_000);
    const out = await db.$queryRaw<{ 'QUERY PLAN': string }[]>(
      Prisma.sql`EXPLAIN (ANALYZE, BUFFERS) ${storeViewDaysQuery(`${p}4242`, from, to)}`,
    );
    const plan = out.map((r) => r['QUERY PLAN']).join('\n');
    process.stdout.write(`\nTIP-V42-710 store daily views (300000 rows, temp clone):\n${plan}\n`);
    const [pk] = await db.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes
      WHERE schemaname LIKE 'pg_temp%' AND tablename = 'store_daily_views'`;
    // Seek trên PK (store_id =, day khoảng): Index / Index Only / Bitmap Index Scan đều là đi thẳng vào index
    expect(plan).toMatch(new RegExp(`Index (Only )?Scan (using|on) ${pk?.indexname ?? '?'} `));
    expect(plan).toMatch(/Index Cond: \(\(store_id = .*\(day >= .*\(day <= /);
    expect(plan).not.toMatch(/Seq Scan/);
    const rows = await db.$queryRaw<{ day: string }[]>(storeViewDaysQuery(`${p}4242`, from, to));
    expect(rows.length).toBeGreaterThanOrEqual(13);
  });
});
