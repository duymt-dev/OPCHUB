import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  captureMockAffiliateSnapshot,
  resetMockDb,
  seedMockAffiliateScenario,
} from '@opchub/shared/mock-domains';
import { createPrismaClient } from '../src/client';
import { seedDemo } from '../seed/demo/index';
import { seedDemoRevenueBaseline } from '../seed/demo/revenue-baseline';
import { resetDemoRevenue } from '../seed/demo/revenue-reset';
import { testEnv } from './env';

const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 2 });
beforeAll(() => seedDemo(db, { affiliate: true }));
afterAll(() => db.$disconnect());
describe('REQ-617 native demo receipt/epoch baseline', () => {
  it('D-122 native and early-initialized MSW have identical epochs, no retroactive shares', async () => {
    resetMockDb();
    captureMockAffiliateSnapshot();
    seedMockAffiliateScenario();
    const mock = captureMockAffiliateSnapshot().revenue;
    const rows = await db.revenueCustomer.findMany({
      select: { userId: true, firstReceivedAt: true },
    });
    expect(new Map(rows.map((r) => [r.userId, r.firstReceivedAt.toISOString()]))).toEqual(
      new Map(mock?.first),
    );
    expect(await db.revenueShare.count()).toBe(0);
    expect(await db.revenuePayout.count()).toBe(0);
    const periods = await db.membershipFeePeriod.findMany({
      where: { id: { startsWith: 'demo-fee-' } },
      select: {
        userId: true,
        amount: true,
        createdAt: true,
        paymentTransaction: {
          select: { amount: true, receivedAt: true, matchedUserId: true, matchStatus: true },
        },
      },
    });
    expect(periods.length).toBeGreaterThan(50);
    for (const row of periods)
      expect(row.paymentTransaction).toEqual({
        amount: row.amount,
        receivedAt: row.createdAt,
        matchedUserId: row.userId,
        matchStatus: 'matched',
      });
  });
  it('rerunning baseline creates no duplicates or outbox events', async () => {
    const before = await db.paymentTransaction.findMany({ orderBy: { id: 'asc' } });
    const events = await db.outboxEvent.count();
    const epochs = await db.revenueCustomer.findMany({ orderBy: { userId: 'asc' } });
    await db.$transaction((tx) => seedDemoRevenueBaseline(tx));
    expect(await db.paymentTransaction.findMany({ orderBy: { id: 'asc' } })).toEqual(before);
    expect(await db.revenueCustomer.findMany({ orderBy: { userId: 'asc' } })).toEqual(epochs);
    expect(await db.outboxEvent.count()).toBe(events);
  });
  it('clears bank/payout/share snapshots in FK order; does not erase delivered evidence', async () => {
    await expect(
      db.$transaction(async (tx) => {
        const payout = await tx.revenuePayout.create({
          data: {
            requestKey: 'seed-reset',
            directorId: 'm3',
            directorName: 'Demo',
            region: 'north',
            monthKey: '2026-09',
            amount: 50,
            shareCount: 1,
            bankName: 'Demo',
            bankNo: '123',
            bankHolder: 'DEMO',
            paidBy: 'admin',
            paidAt: new Date('2026-10-01T00:00:00Z'),
          },
        });
        await tx.revenueShare.create({
          data: {
            source: 'membership',
            sourceId: 'reset-source',
            plan: 'personal',
            customerId: 'm1',
            affiliateId: 'a1',
            region: 'north',
            directorId: 'm3',
            directorName: 'Demo',
            receivedAt: new Date('2026-09-01'),
            recordedAt: new Date('2026-09-01'),
            firstReceivedAt: new Date('2026-09-01'),
            customerYear: 1,
            amount: 100,
            yearOneRate: 50,
            annualDecrease: 10,
            minimumRate: 20,
            directorRate: 50,
            directorAmount: 50,
            mediaSoftAmount: 50,
            monthKey: '2026-09',
            status: 'paid',
            payoutId: payout.id,
          },
        });
        await tx.revenueRecipientBank.create({ data: { directorId: 'retired-demo' } });
        const event = await tx.outboxEvent.create({
          data: {
            type: 'affiliate.revenue_received',
            payload: {},
            dispatchedAt: new Date(),
          },
        });
        await resetDemoRevenue(tx);
        expect(await tx.revenueShare.count()).toBe(0);
        expect(await tx.revenuePayout.count()).toBe(0);
        expect(await tx.revenueRecipientBank.count()).toBe(0);
        expect(await tx.revenueCustomer.count()).toBe(0);
        expect(await tx.outboxEvent.findUnique({ where: { id: event.id } })).toEqual(event);
        throw new Error('rollback fixture');
      }),
    ).rejects.toThrow('rollback fixture');
    expect(await db.revenueCustomer.count()).toBeGreaterThan(50);
  });
  it('D-122 preserves the expired member historical receipt without activating access', async () => {
    const user = await db.user.findUniqueOrThrow({
      where: { id: 'm4' },
      select: { status: true, membershipFee: { select: { status: true } } },
    });
    expect(user).toEqual({ status: 'locked', membershipFee: { status: 'expired' } });
    const period = await db.membershipFeePeriod.findUniqueOrThrow({
      where: { id: 'demo-fee-m4' },
      select: {
        createdAt: true,
        paymentTransaction: { select: { content: true, receivedAt: true } },
      },
    });
    expect(period.createdAt.toISOString()).toBe('2025-08-31T17:00:00.000Z');
    expect(period.paymentTransaction).toEqual({
      content: 'OPCHUB TV000004',
      receivedAt: period.createdAt,
    });
    expect(await db.revenueCustomer.findUniqueOrThrow({ where: { userId: 'm4' } })).toMatchObject({
      firstReceivedAt: period.createdAt,
    });
  });
  it.each(['affiliate.revenue_received', 'affiliate.revenue_payout_recorded'])(
    'refuses destructive reset while %s is pending, without faking dispatch',
    async (type) => {
      const before = await db.revenueCustomer.count();
      await expect(
        db.$transaction(async (tx) => {
          await tx.outboxEvent.create({ data: { type, payload: {} } });
          await resetDemoRevenue(tx);
        }),
      ).rejects.toThrow('draining pending revenue outbox');
      expect(await db.revenueCustomer.count()).toBe(before);
    },
  );
});
