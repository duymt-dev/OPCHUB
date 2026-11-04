import { afterAll, describe, expect, it } from 'vitest';
import { AFFILIATE_PAYOUT_SCENARIO as scenario } from '@opchub/shared/fixtures';
import { createPrismaClient } from '../src/client';
import { assertDemoDatabase } from '../seed/demo/guard';
import { seedDemo } from '../seed/demo/index';
import { testEnv } from './env';

if (!['opchub_test', 'opchub_v46_801_test'].includes(assertDemoDatabase(testEnv.TEST_DATABASE_URL)))
  throw new Error('Payout fixture integration requires opchub_test');
const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 2 });
afterAll(async () => {
  await seedDemo(db);
  await db.$disconnect();
});

describe('AT-AF06 native payout fixture matches MSW without changing AF0 defaults', () => {
  it('moves the entire first-fee/referral history coherently, leaving paid bank snapshots unchanged', async () => {
    await seedDemo(db, { affiliatePayout: true });
    const commission = await db.commission.findUniqueOrThrow({
      where: { id: scenario.commissionId },
      select: { monthKey: true, createdAt: true, amount: true, status: true, feePeriodId: true },
    });
    expect(commission).toMatchObject({
      monthKey: scenario.month,
      createdAt: new Date(scenario.paidAt),
      // D-110: c16 Gói Cá nhân 1.200.000 × 25%
      amount: 300000,
      status: 'recorded',
    });
    const period = await db.membershipFeePeriod.findUniqueOrThrow({
      where: { id: commission.feePeriodId ?? '' },
      select: { startsAt: true, endsAt: true, createdAt: true },
    });
    expect(period).toEqual({
      startsAt: new Date(scenario.paidAt),
      endsAt: new Date(scenario.validUntil),
      createdAt: new Date(scenario.paidAt),
    });
    const customer = await db.user.findUniqueOrThrow({
      where: { id: scenario.customerId },
      select: { createdAt: true, membershipFee: { select: { paidAt: true, validUntil: true } } },
    });
    expect(customer).toEqual({
      createdAt: new Date(scenario.paidAt),
      membershipFee: {
        paidAt: new Date(scenario.paidAt),
        validUntil: new Date(scenario.validUntil),
      },
    });
    const referral = await db.referral.findUniqueOrThrow({
      where: { id: scenario.referralId },
      select: { monthKey: true, convertedAt: true },
    });
    expect(referral).toEqual({ monthKey: scenario.month, convertedAt: new Date(scenario.paidAt) });
    const owner = await db.affiliate.findUniqueOrThrow({
      where: { id: scenario.affiliateId },
      select: { bankName: true, bankNo: true, bankHolder: true },
    });
    expect(owner).toEqual({ bankName: null, bankNo: null, bankHolder: null });
    const old = await db.commission.findUniqueOrThrow({
      where: { id: 'demo-commission-c19' },
      select: { status: true, paidBankSnapshot: true },
    });
    expect(old).toMatchObject({
      status: 'paid',
      paidBankSnapshot: { bankName: 'ACB', bankNo: '24681357' },
    });
    expect(await db.commission.count()).toBe(53);
  });
  it('ordinary AF0 resets the precondition instead of globally backdating a real business event', async () => {
    await seedDemo(db, { affiliate: true });
    const normal = await db.commission.findUniqueOrThrow({
      where: { id: scenario.commissionId },
      select: { monthKey: true },
    });
    expect(normal.monthKey).toBe('2026-10');
    const owner = await db.affiliate.findUniqueOrThrow({
      where: { id: scenario.affiliateId },
      select: { bankName: true },
    });
    expect(owner.bankName).toBe('ACB');
  });
});
