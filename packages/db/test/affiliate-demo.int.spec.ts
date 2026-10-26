import { verify } from 'argon2';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../src/client';
import { assertDemoDatabase } from '../seed/demo/guard';
import { seedDemo } from '../seed/demo/index';
import { seedAffiliateScenario } from '../seed/demo/affiliate-scenario';
import { testEnv } from './env';

const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 2 });
const counts = async () => ({
  agents: await db.affiliate.count(),
  refs: await db.referral.count(),
  commissions: await db.commission.count(),
  clicks: await db.affiliateClickDaily.count(),
  fees: await db.membershipFeePeriod.count(),
});
describe('Affiliate AF0 native demo scenario', () => {
  it('AT-AF05 expired owner has a coherent one-year period covering all old commissions', async () => {
    await seedDemo(db, { affiliatePaused: true });
    const owner = await db.affiliate.findUniqueOrThrow({
      where: { code: 'HAOPC' },
      select: {
        status: true,
        user: {
          select: {
            createdAt: true,
            membershipFee: { select: { status: true, validUntil: true } },
          },
        },
      },
    });
    expect(owner).toMatchObject({
      status: 'paused',
      user: { membershipFee: { status: 'expired' } },
    });
    const period = await db.membershipFeePeriod.findUniqueOrThrow({
      where: { id: 'demo-fee-af-owner-a3' },
      select: { startsAt: true, endsAt: true },
    });
    expect(period.endsAt.getTime() - period.startsAt.getTime()).toBe(365 * 86_400_000);
    expect(owner.user.membershipFee?.validUntil).toEqual(period.endsAt);
    expect(owner.user.createdAt.getTime()).toBeLessThanOrEqual(period.startsAt.getTime());
    const outOfPeriod = await db.commission.count({
      where: {
        affiliateId: 'a3',
        OR: [{ createdAt: { lt: period.startsAt } }, { createdAt: { gt: period.endsAt } }],
      },
    });
    expect(outOfPeriod).toBe(0);
    await seedDemo(db, { affiliate: true });
  }, 120_000);
  beforeAll(async () => {
    assertDemoDatabase(testEnv.TEST_DATABASE_URL);
    await seedDemo(db, { affiliate: true });
  }, 120_000);
  afterAll(async () => {
    // Other test suites retain their independent eight-member baseline.
    await seedDemo(db);
    await db.$disconnect();
  }, 120_000);

  it('REQ-301 REQ-311 all 51 customers have real first periods and their own affiliates', async () => {
    expect(await counts()).toEqual({ agents: 62, refs: 51, commissions: 51, clicks: 6, fees: 62 });
    const rows = await db.commission.findMany({
      where: { id: { startsWith: 'demo-commission-' } },
      select: {
        referredUserId: true,
        feePeriodId: true,
        listAmount: true,
        rate: true,
        amount: true,
        feePeriod: { select: { userId: true, amount: true, startsAt: true } },
        referredUser: { select: { affiliate: { select: { id: true } } } },
      },
    });
    expect(rows).toHaveLength(51);
    for (const r of rows) {
      expect(r.feePeriod?.userId).toBe(r.referredUserId);
      expect(r.feePeriod?.amount).toBe(600000);
      expect(r.amount).toBe((600000 * r.rate) / 100);
      expect(r.referredUser.affiliate).not.toBeNull();
    }
  });

  it('REQ-303 HAOPC is a paid login account, not a code detached from a user', async () => {
    const ha = await db.affiliate.findUniqueOrThrow({
      where: { code: 'HAOPC' },
      select: {
        rate: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            passwordHash: true,
            membershipFee: { select: { status: true } },
          },
        },
      },
    });
    expect(ha.rate).toBe(25);
    expect(ha.user).toMatchObject({
      id: 'af-owner-a3',
      fullName: 'Lê Thu Hà',
      email: 'ha.le@opcmedia.vn',
      membershipFee: { status: 'active' },
    });
    expect(await verify(ha.user.passwordHash ?? '', 'User@2026')).toBe(true);
  });

  it('REQ-311 m1 monthly totals and immutable payout snapshots match AF0', async () => {
    const rows = await db.commission.findMany({
      where: { affiliateId: 'a1' },
      select: { status: true, amount: true, monthKey: true, paidAt: true, paidBankSnapshot: true },
    });
    expect(rows).toHaveLength(9);
    expect(rows.filter((r) => r.monthKey === '2026-10').reduce((n, r) => n + r.amount, 0)).toBe(
      360000,
    );
    const paid = rows.filter((r) => r.status === 'paid');
    expect(paid.reduce((n, r) => n + r.amount, 0)).toBe(720000);
    expect(new Set(paid.map((r) => r.paidAt?.toISOString())).size).toBe(2);
    expect(paid.every((r) => r.paidBankSnapshot !== null)).toBe(true);
    const clicks = await db.affiliateClickDaily.aggregate({
      where: { affiliateId: 'a1' },
      _sum: { count: true },
    });
    expect(clicks._sum.count).toBe(412);
    const owner = await db.affiliate.findUniqueOrThrow({
      where: { id: 'a1' },
      select: { createdAt: true },
    });
    const oldest = await db.commission.findFirstOrThrow({
      where: { affiliateId: 'a1' },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });
    expect(owner.createdAt.getTime()).toBeLessThan(oldest.createdAt.getTime());
    const cancelled = await db.commission.findMany({
      where: { status: 'cancelled' },
      select: { cancelReason: true, cancelledAt: true, cancelledBy: true },
    });
    expect(cancelled).toHaveLength(1);
    expect(cancelled[0]).toMatchObject({ cancelledBy: 'admin' });
    expect(cancelled[0]?.cancelReason).toBeTruthy();
    expect(cancelled[0]?.cancelledAt).not.toBeNull();
  });

  it('REQ-311 repeated additive seed and complete reset are both idempotent', async () => {
    const first = await counts();
    await db.$transaction(seedAffiliateScenario, { timeout: 60_000 });
    expect(await counts()).toEqual(first);
    await db.affiliatePolicy.update({
      where: { id: 1 },
      data: { defaultRate: 35, cookieDays: 45 },
    });
    await seedDemo(db, { affiliate: true });
    expect(await counts()).toEqual(first);
    expect(await db.affiliatePolicy.findUnique({ where: { id: 1 } })).toMatchObject({
      defaultRate: 20,
      cookieDays: 30,
    });
    await seedDemo(db);
    expect(await counts()).toEqual({ agents: 6, refs: 0, commissions: 0, clicks: 0, fees: 6 });
    expect(await db.user.count({ where: { id: { startsWith: 'af-' } } })).toBe(0);
  }, 120_000);
});
