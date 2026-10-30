import { randomUUID } from 'node:crypto';
import { createPrismaClient, type DbClient, Prisma } from '@opchub/db';
import { planAmountOf } from '@opchub/shared';
import { pageSchema } from '@opchub/shared/api';
import { feeRowSchema, feeSummarySchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadEnv } from '@/common/config';
import { feeGroupNamesQuery } from '@/modules/membership-fee/repositories/admin-fees.repository';
import { PriceConfigService } from '@/modules/pricing';
import { addMember, createGroup, removeTestGroups } from '../factories/group.factory';
import {
  assignMemberCode,
  createUser,
  flushAuthState,
  loginOf,
  tokenBodySchema,
} from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

/**
 * TIP-V42-708 (D-101, prototype v4.2 Admin › Phí): doanh thu = Σ giá năm hiện hành theo gói của TV đang hiệu lực
 * + sắp hết hạn; cột "Nhóm tham gia" theo lô; "Gửi nhắc hàng loạt" gồm trial.
 */
describe('Admin Phí v4.2 (TIP-V42-708)', () => {
  let t: TestApp;
  let token: string;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    const admin = await createUser(t, { systemRole: 'admin' });
    token = tokenBodySchema.parse(await (await loginOf(t, admin)).json()).accessToken;
  });
  beforeEach(() => flushAuthState(t));
  afterAll(async () => {
    await removeTestGroups(t);
    await t.close();
  });

  const summary = async () =>
    feeSummarySchema.parse(await (await t.call('/admin/fees/summary', { token })).json());

  it('D-101 thẻ: đếm 6 nhóm; doanh thu tăng đúng giá năm theo gói của active + expiring', async () => {
    const before = await summary();
    await createUser(t, { accountType: 'business', fee: 'active' });
    await createUser(t, { accountType: 'personal', fee: 'expiring' });
    await createUser(t, { accountType: 'business', fee: 'trial' });
    await createUser(t, { accountType: 'personal', fee: 'expired' });
    await createUser(t, { accountType: 'personal', fee: 'pending_payment' });
    const after = await summary();
    const prices = await t.app.get(PriceConfigService).current();
    expect(after.revenue - before.revenue).toBe(
      planAmountOf(prices, 'business') + planAmountOf(prices, 'personal'),
    );
    expect(after.total - before.total).toBe(5);
    for (const k of ['active', 'expiring', 'trial', 'expired', 'pending_payment'] as const)
      expect(after[k] - before[k]).toBe(1);
    expect(after.paid - before.paid).toBe(2);
    expect(after.regional_director).toBe(before.regional_director);
    expect(after.total).toBe(
      after.trial +
        after.active +
        after.pending_payment +
        after.expiring +
        after.expired +
        after.regional_director,
    );
  });

  it('cột Nhóm tham gia: tên nhóm đang là thành viên; không nhóm → []', async () => {
    const [g1, g2] = [await createGroup(t), await createGroup(t)];
    const a = await createUser(t, { fee: 'trial' });
    const b = await createUser(t, { fee: 'trial' });
    await addMember(t, g1.id, a.id);
    await addMember(t, g2.id, a.id);
    const rowOf = async (id: string) => {
      const code = await assignMemberCode(t, id);
      const r = await t.call(`/admin/fees?status=trial&q=${code}`, { token });
      return pageSchema(feeRowSchema).parse(await r.json()).items[0];
    };
    expect([...((await rowOf(a.id))?.groups ?? [])].sort()).toEqual([g1.name, g2.name].sort());
    expect((await rowOf(b.id))?.groups).toEqual([]);
  });

  it('Gửi nhắc hàng loạt gồm TV đang miễn phí 3 tháng (mẫu trial D-113); active không nhắc', async () => {
    const trial = await createUser(t, { fee: 'trial' });
    const active = await createUser(t, { fee: 'active' });
    const res = await t.call('/admin/fees/remind-all', { method: 'POST', token });
    expect(res.status).toBe(202);
    const mails = await t.prisma.db.mailLog.findMany({
      where: { to: { in: [trial.email, active.email] }, kind: 'fee_reminder' },
      select: { to: true, subject: true },
    });
    expect(mails).toEqual([{ to: trial.email, subject: 'Sắp hết 3 tháng miễn phí OPC Hub' }]);
  });
});

describe('Admin Phí — EXPLAIN nhóm theo lô (TIP-V42-708)', () => {
  let db: DbClient;
  beforeAll(async () => {
    // Bản sao tạm theo schema đã triển khai (cột, CHECK, index) — đo kế hoạch tách khỏi dữ liệu test khác
    db = createPrismaClient(loadEnv().DATABASE_URL, { max: 1 });
    await db.$executeRaw`CREATE TEMP TABLE groups (LIKE public.groups INCLUDING ALL)`;
    await db.$executeRaw`CREATE TEMP TABLE group_members (LIKE public.group_members INCLUDING ALL)`;
  });
  afterAll(async () => {
    await db.$executeRaw`DROP TABLE IF EXISTS pg_temp.group_members`;
    await db.$executeRaw`DROP TABLE IF EXISTS pg_temp.groups`;
    await db.$disconnect();
  });

  it('10000 TV × 2 nhóm: 1 query cho 20 dòng trang dùng index, không Seq Scan group_members', async () => {
    const p = `fgx-${randomUUID()}-`;
    await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`
          INSERT INTO groups (id, slug, province, region, kind, name, updated_at)
          SELECT ${p} || n, ${p} || n, 'P' || n, 'north', 'province', 'Nhóm ' || n, now()
          FROM generate_series(1, 200) n`;
        await tx.$executeRaw`
          INSERT INTO group_members (group_id, user_id, status, updated_at)
          SELECT ${p} || (1 + (n + k * 7) % 200), ${p} || 'u' || n, 'member', now()
          FROM generate_series(1, 10000) n, generate_series(0, 1) k`;
      },
      { timeout: 60000 },
    );
    await db.$executeRaw`VACUUM (ANALYZE) groups`;
    await db.$executeRaw`VACUUM (ANALYZE) group_members`;
    const ids = Array.from({ length: 20 }, (_, i) => `${p}u${5000 + i}`);
    const out = await db.$queryRaw<{ 'QUERY PLAN': string }[]>(
      Prisma.sql`EXPLAIN (ANALYZE, BUFFERS) ${feeGroupNamesQuery(ids)}`,
    );
    const plan = out.map((r) => r['QUERY PLAN']).join('\n');
    process.stdout.write(`\nTIP-V42-708 fee groups (20000 group_members, temp clones):\n${plan}\n`);
    expect(plan).toMatch(/Index (Only )?Scan .*group_members/);
    expect(plan).not.toMatch(/Seq Scan on group_members/);
    const rows = await db.$queryRaw<{ user_id: string; names: string[] }[]>(
      feeGroupNamesQuery(ids),
    );
    expect(rows).toHaveLength(20);
    expect(rows.every((r) => r.names.length === 2)).toBe(true);
  });
});
