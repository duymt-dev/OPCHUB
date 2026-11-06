import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  affiliateCommissionsSchema,
  affiliateSummarySchema,
  affiliateReferralsSchema,
  myAffiliateSchema,
  csvFileSchema,
  affiliateDetailSchema,
  affiliateMonthsSchema,
  affiliateAdminCustomersSchema,
} from '@opchub/shared/api-domains';
import { createAffiliateApp } from '../factories/affiliate.factory';
import { affiliateEarning, affiliateAdminToken } from '../factories/affiliate-admin.factory';
import { tokenOf } from '../factories/group.factory';
import { flushAuthState } from '../factories/user.factory';
import type { TestApp } from '../setup/test-app';

const MONTH = '1999-07';
describe('REQ-622 BR-463 historic zero commissions', () => {
  let t: TestApp, admin: string, member: string;
  let positive: Awaited<ReturnType<typeof affiliateEarning>>;
  let zeros: Awaited<ReturnType<typeof affiliateEarning>>[];
  let base: ReturnType<typeof affiliateSummarySchema.parse>;
  const summary = async () =>
    affiliateSummarySchema.parse(
      await (await t.call(`/admin/affiliate/summary?month=${MONTH}`, { token: admin })).json(),
    );
  beforeAll(async () => {
    t = await createAffiliateApp();
    await flushAuthState(t);
    admin = (await affiliateAdminToken(t)).token;
    base = await summary();
    positive = await affiliateEarning(t);
    zeros = [await affiliateEarning(t, positive), await affiliateEarning(t, positive)];
    const ids = [positive, ...zeros].map((r) => r.commission.id);
    await t.prisma.db.commission.updateMany({
      where: { id: { in: ids } },
      data: { amount: 200000, listAmount: 1000000, monthKey: MONTH },
    });
    // Simulate pre-migration data in TEST ONLY: the exclusive DDL lock and re-added
    // NOT VALID constraint commit atomically. No moment exposes an unguarded table.
    await t.prisma.db.$transaction(async (tx) => {
      await tx.$executeRaw`ALTER TABLE commissions DROP CONSTRAINT commissions_amount_positive`;
      await tx.commission.update({
        where: { id: zeros[0]?.commission.id ?? '' },
        data: { amount: 0 },
      });
      await tx.commission.update({
        where: { id: zeros[1]?.commission.id ?? '' },
        data: { amount: 0, status: 'paid', paidAt: new Date() },
      });
      await tx.$executeRaw`ALTER TABLE commissions ADD CONSTRAINT commissions_amount_positive CHECK (amount > 0) NOT VALID`;
    });
    member = await tokenOf(t, positive.user);
  });
  afterAll(async () => {
    if (positive)
      await t.prisma.db.commission.deleteMany({ where: { affiliateId: positive.affiliate.id } });
    await t.close();
  });

  it('admin list, count, summary, affiliate totals, month and customer history ignore stored zero rows', async () => {
    const page = affiliateCommissionsSchema.parse(
      await (
        await t.call(`/admin/affiliate/commissions?q=${positive.affiliate.code}`, { token: admin })
      ).json(),
    );
    expect(page.total).toBe(1);
    expect(page.items.map((r) => r.id)).toEqual([positive.commission.id]);
    const totals = await summary();
    expect(totals.totalCommission - base.totalCommission).toBe(200000);
    expect(totals.revenue - base.revenue).toBe(1000000);
    expect(totals.plans.personal - base.plans.personal).toBe(1);
    const detail = affiliateDetailSchema.parse(
      await (await t.call(`/admin/affiliates/${positive.affiliate.id}`, { token: admin })).json(),
    );
    expect(detail.stats.commission).toBe(200000);
    expect(detail.stats.customers).toBe(1);
    const months = affiliateMonthsSchema.parse(
      await (
        await t.call(`/admin/affiliates/${positive.affiliate.id}/months`, { token: admin })
      ).json(),
    );
    expect(months.total).toBe(1);
    expect(months.items[0]?.amount).toBe(200000);
    const customers = affiliateAdminCustomersSchema.parse(
      await (
        await t.call(`/admin/affiliates/${positive.affiliate.id}/customers`, { token: admin })
      ).json(),
    );
    expect(customers.total).toBe(1);
    expect(
      await t.prisma.db.commission.count({
        where: { affiliateId: positive.affiliate.id, amount: 0 },
      }),
    ).toBe(2);
  });

  it('portal paidCount and payouts hide zero; zero-only converted customer falls back to pending referral', async () => {
    const mine = myAffiliateSchema.parse(
      await (await t.call('/me/affiliate', { token: member })).json(),
    );
    expect(mine.state).toBe('active');
    if (mine.state !== 'active') throw new Error('Expected affiliate');
    expect(mine.stats.paidCount).toBe(1);
    expect(mine.stats.received).toBe(0);
    const refs = affiliateReferralsSchema.parse(
      await (await t.call('/me/affiliate/referrals', { token: member })).json(),
    );
    expect(refs.items.some((r) => zeros.some((z) => z.commission.id === r.id))).toBe(false);
    expect(refs.items.filter((r) => r.status === 'pending')).toHaveLength(2);
    expect(refs.summary.commission).toBe(200000);
    const payouts = await (await t.call('/me/affiliate/payouts', { token: member })).json();
    expect(payouts).toMatchObject({ total: 0, items: [] });
  });

  it('csv has exactly one positive commission', async () => {
    const response = await t.call('/admin/affiliate/commissions/export', {
      method: 'POST',
      token: admin,
      json: { q: positive.affiliate.code },
    });
    expect(response.status).toBe(200);
    const file = csvFileSchema.parse(await response.json());
    expect(file.csv.charCodeAt(0)).toBe(0xfeff);
    expect(file.csv.trim().split('\n')).toHaveLength(2);
  });

  it('constraint rejects a new zero INSERT; historical zero records remain NOT VALID', async () => {
    const id = randomUUID();
    await expect(t.prisma.db
      .$executeRaw`INSERT INTO commissions(id,affiliate_id,referred_user_id,fee_period_id,list_amount,source,plan,amount,rate,month_key)
      SELECT ${id},affiliate_id,referred_user_id,fee_period_id,list_amount,source,plan,0,rate,month_key FROM commissions WHERE id=${positive.commission.id}`).rejects.toThrow(
      'commissions_amount_positive',
    );
    const constraints = await t.prisma.db.$queryRaw<
      { convalidated: boolean }[]
    >`SELECT convalidated FROM pg_constraint WHERE conname='commissions_amount_positive'`;
    expect(constraints).toEqual([{ convalidated: false }]);
  });

  it('rate change rounding to zero leaves prior amount and rate intact', async () => {
    await t.prisma.db.commission.update({
      where: { id: positive.commission.id },
      data: { listAmount: 1, amount: 1, rate: 50 },
    });
    const response = await t.call(`/admin/affiliates/${positive.affiliate.id}`, {
      method: 'PATCH',
      token: admin,
      json: { rate: 1 },
    });
    expect(response.status).toBe(200);
    expect(
      await t.prisma.db.commission.findUniqueOrThrow({
        where: { id: positive.commission.id },
        select: { rate: true, amount: true },
      }),
    ).toEqual({ rate: 50, amount: 1 });
  });
});
