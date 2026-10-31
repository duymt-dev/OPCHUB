import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  affiliateRevenueCustomers,
  affiliateRevenueOwners,
  buildAffiliateRevenueDemo,
} from '@opchub/shared/fixtures';
import {
  captureMockAffiliateSnapshot,
  resetMockDb,
  seedMockAffiliateScenario,
} from '@opchub/shared/mock-domains';
import { createPrismaClient } from '../src/client';
import { seedDemo } from '../seed/demo/index';
import { seedAffiliateRevenueDemo } from '../seed/demo/revenue-affiliate-ledger';
import { testEnv } from './env';

const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 2 });
beforeAll(() => seedDemo(db, { affiliate: true }));
afterAll(async () => {
  await seedDemo(db);
  await db.$disconnect();
});

describe('REQ-617 D-119 native AF0 ledger and actual receipt provenance', () => {
  it('matches every MSW share and historical payout with the same source IDs and amounts', async () => {
    resetMockDb();
    seedMockAffiliateScenario();
    const mock = captureMockAffiliateSnapshot().revenue!;
    const rows = await db.revenueShare.findMany({ orderBy: { id: 'asc' } });
    expect(rows).toHaveLength(51);
    expect(mock.shares).toHaveLength(51);
    for (const share of mock.shares) {
      expect(rows.find((r) => r.id === share.id)).toMatchObject({
        sourceId: share.sourceId,
        customerId: share.customerId,
        affiliateId: share.affiliateId,
        directorId: share.director?.id ?? null,
        region: share.region,
        firstReceivedAt: new Date(share.firstReceivedAt),
        receivedAt: new Date(share.receivedAt),
        amount: share.amount,
        customerYear: share.customerYear,
        directorRate: share.directorRate,
        directorAmount: share.directorAmount,
        mediaSoftAmount: share.mediaSoftAmount,
        status: share.status,
        payoutId: share.payoutId,
      });
    }
    const payouts = await db.revenuePayout.findMany({ orderBy: { id: 'asc' } });
    expect(payouts).toHaveLength(2);
    for (const { receipt } of mock.payouts)
      expect(payouts.find((p) => p.id === receipt.id)).toMatchObject({
        directorId: receipt.directorId,
        monthKey: receipt.monthKey,
        amount: BigInt(receipt.amount),
        shareCount: receipt.shareCount,
        paidAt: new Date(receipt.paidAt),
        ...receipt.bank,
      });
  });
  it('links every allocated receipt and first epoch to real bank/period records and prior registrations', async () => {
    const ids = [...affiliateRevenueCustomers, ...affiliateRevenueOwners].map((p) => p.userId);
    const periods = await db.membershipFeePeriod.findMany({
      where: { userId: { in: ids } },
      select: {
        userId: true,
        amount: true,
        paymentTransaction: {
          select: { id: true, receivedAt: true, amount: true, matchStatus: true },
        },
      },
    });
    const users = await db.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, createdAt: true, revenueCustomer: true },
    });
    for (const p of [...affiliateRevenueCustomers, ...affiliateRevenueOwners]) {
      const user = users.find((u) => u.id === p.userId)!;
      expect(user.createdAt.getTime()).toBeLessThan(Date.parse(p.firstReceivedAt));
      expect(user.revenueCustomer!.firstReceivedAt.toISOString()).toBe(p.firstReceivedAt);
      const payments = periods.filter(
        (f) => f.userId === p.userId && f.paymentTransaction?.matchStatus === 'matched',
      );
      expect(Math.min(...payments.map((f) => f.paymentTransaction!.receivedAt.getTime()))).toBe(
        Date.parse(p.firstReceivedAt),
      );
    }
    for (const share of buildAffiliateRevenueDemo().shares)
      expect(periods.find((p) => p.paymentTransaction?.id === share.sourceId)).toMatchObject({
        userId: share.customerId,
        amount: share.amount,
      });
    const invalid = await db.referral.findUniqueOrThrow({
      where: { referredUserId: 'af-customer-c18' },
      select: { status: true },
    });
    expect(invalid.status).toBe('void');
  });
  it('has prior north appointment and earliest actual province memberships, with exact retained read model', async () => {
    const north = await db.regionalDirector.findUniqueOrThrow({
      where: { region: 'north' },
      select: { appointedAt: true },
    });
    const first = await db.revenueShare.findFirstOrThrow({
      where: { directorId: 'm3' },
      orderBy: { receivedAt: 'asc' },
      select: { receivedAt: true },
    });
    expect(north.appointedAt!.getTime()).toBeLessThan(first.receivedAt.getTime());
    const joins = await db.groupMember.findMany({
      where: {
        userId: { in: affiliateRevenueOwners.map((a) => a.userId) },
        group: { kind: 'province' },
        status: 'member',
      },
      orderBy: [{ createdAt: 'asc' }, { groupId: 'asc' }],
      select: { userId: true, group: { select: { province: true } } },
    });
    for (const a of affiliateRevenueOwners)
      expect(joins.find((r) => r.userId === a.userId)?.group.province).toBe(a.province);
    const totals = await db.statsDaily.groupBy({
      by: ['dimension'],
      where: { metric: 'affiliate_revenue_retained' },
      _sum: { value: true },
    });
    expect(totals.find((r) => r.dimension === 'attributed')?._sum.value).toBe(55920000n);
  });
  it('is idempotent and rolls back the whole demo transaction after a later failure', async () => {
    const before = await db.revenueShare.findMany({ orderBy: { id: 'asc' } });
    await db.$transaction((tx) => seedAffiliateRevenueDemo(tx));
    expect(await db.revenueShare.findMany({ orderBy: { id: 'asc' } })).toEqual(before);
    await expect(
      db.$transaction(async (tx) => {
        await tx.revenueShare.deleteMany({});
        throw new Error('rollback AF0');
      }),
    ).rejects.toThrow('rollback AF0');
    expect(await db.revenueShare.findMany({ orderBy: { id: 'asc' } })).toEqual(before);
  });
});
