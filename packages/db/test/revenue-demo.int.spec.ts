import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { REVENUE_DEMO, revenueDemoCustomers, revenueDemoPeople } from '@opchub/shared/fixtures';
import {
  captureMockAffiliateSnapshot,
  resetMockDb,
  seedMockRevenueScenario,
} from '@opchub/shared/mock-domains';
import { createPrismaClient } from '../src/client';
import { seedDemo } from '../seed/demo/index';
import { seedRevenueDemo } from '../seed/demo/revenue-scenario';
import { testEnv } from './env';

const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 2 });
beforeAll(() => seedDemo(db, { revenue: true }));
afterAll(async () => {
  await seedDemo(db);
  await db.$disconnect();
});
describe('REQ-617 native/MSW shared revenue scenario', () => {
  it('persists exactly the same financial snapshots, including receipt IDs and first epochs', async () => {
    resetMockDb();
    seedMockRevenueScenario();
    const mock = captureMockAffiliateSnapshot().revenue;
    if (!mock) throw new Error('Missing mock ledger');
    const native = await db.revenueShare.findMany({ orderBy: { id: 'asc' } });
    expect(native).toHaveLength(5);
    for (const share of mock.shares) {
      expect(native.find((r) => r.id === share.id)).toMatchObject({
        sourceId: share.sourceId,
        source: share.source,
        plan: share.plan,
        customerId: share.customerId,
        affiliateId: share.affiliateId,
        directorId: share.director?.id ?? null,
        region: share.region,
        amount: share.amount,
        customerYear: share.customerYear,
        directorRate: share.directorRate,
        directorAmount: share.directorAmount,
        mediaSoftAmount: share.mediaSoftAmount,
        firstReceivedAt: new Date(share.firstReceivedAt),
        receivedAt: new Date(share.receivedAt),
        recordedAt: new Date(share.recordedAt),
        monthKey: share.monthKey,
        status: share.status,
      });
    }
    expect(native.reduce((sum, r) => sum + r.directorAmount, 0)).toBe(1680001);
    expect(native.reduce((sum, r) => sum + r.mediaSoftAmount, 0)).toBe(6720000);
  });
  it('has real linked paid periods, eligible appointment chronology and an actual affiliate province', async () => {
    const users = await db.user.findMany({
      where: { id: { in: revenueDemoPeople.map((p) => p.id) } },
      select: { id: true, createdAt: true, revenueCustomer: true },
    });
    const periods = await db.membershipFeePeriod.findMany({
      where: { userId: { in: revenueDemoPeople.map((p) => p.id) } },
      select: {
        userId: true,
        createdAt: true,
        amount: true,
        paymentTransaction: {
          select: {
            id: true,
            receivedAt: true,
            amount: true,
            matchStatus: true,
          },
        },
      },
    });
    expect(periods).toHaveLength(10);
    for (const user of users) {
      const earliest = periods
        .filter((r) => r.userId === user.id)
        .sort((a, b) => +a.createdAt - +b.createdAt)[0];
      expect(earliest?.paymentTransaction?.receivedAt).toEqual(
        user.revenueCustomer?.firstReceivedAt,
      );
      expect(user.createdAt).toEqual(user.revenueCustomer?.firstReceivedAt);
    }
    expect(
      periods.every(
        (r) =>
          r.paymentTransaction?.amount === r.amount &&
          r.paymentTransaction.matchStatus === 'matched',
      ),
    ).toBe(true);
    const director = await db.user.findUniqueOrThrow({
      where: { id: 'm3' },
      select: { createdAt: true },
    });
    expect(+director.createdAt).toBeLessThan(Date.parse(REVENUE_DEMO.appointedAt));
    expect(
      await db.regionalDirectorHistory.findUniqueOrThrow({ where: { id: REVENUE_DEMO.historyId } }),
    ).toMatchObject({
      action: 'appointed',
      userId: 'm3',
      createdAt: new Date(REVENUE_DEMO.appointedAt),
    });
    expect(
      await db.groupMember.findMany({
        where: { userId: REVENUE_DEMO.agentId },
        select: { group: { select: { province: true } } },
      }),
    ).toEqual([{ group: { province: REVENUE_DEMO.province } }]);
  });
  it('is idempotent and does not emit fake bank/mail/outbox effects on repeat', async () => {
    const before = await db.revenueShare.findMany({ orderBy: { id: 'asc' } });
    const outbox = await db.outboxEvent.count();
    const history = await db.regionalDirectorHistory.findMany();
    await db.$transaction((tx) => seedRevenueDemo(tx));
    expect(await db.revenueShare.findMany({ orderBy: { id: 'asc' } })).toEqual(before);
    expect(await db.outboxEvent.count()).toBe(outbox);
    expect(await db.regionalDirectorHistory.findMany()).toEqual(history);
    expect(await db.revenuePayout.count()).toBe(0);
    expect(
      await db.revenueShare.count({
        where: { customerId: { in: revenueDemoCustomers.map((p) => p.id) } },
      }),
    ).toBe(5);
  });
});
