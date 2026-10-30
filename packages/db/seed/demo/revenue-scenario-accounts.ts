import { revenueDemoPeople, revenueDemoPeriods, REVENUE_DEMO } from '@opchub/shared/fixtures';
import type { DbTx } from '../../src/client';

/** Dedicated opt-in fixture accounts; no historical AF0 receipt/commission is rewritten. */
export async function seedRevenueDemoAccounts(tx: DbTx): Promise<void> {
  await tx.user.createMany({
    data: revenueDemoPeople.map((p) => ({
      id: p.id,
      memberCode: p.memberCode,
      fullName: p.name,
      email: p.email,
      accountType: p.plan,
      createdAt: new Date(p.first),
      emailVerifiedAt: new Date(p.first),
      declaredAt: new Date(p.first),
    })),
  });
  await tx.membershipFee.createMany({
    data: revenueDemoPeople.map((p) => ({
      userId: p.id,
      status: 'active',
      plan: p.plan,
      amount: p.amount,
      paidAt: new Date(REVENUE_DEMO.receivedAt),
      validUntil: new Date('2027-09-15T03:00:00Z'),
      createdAt: new Date(p.first),
    })),
  });
  await tx.paymentTransaction.createMany({
    data: revenueDemoPeriods.map((p) => ({
      id: p.paymentId,
      provider: 'demo',
      bankTxnId: p.paymentId,
      amount: p.amount,
      content: p.content,
      receivedAt: new Date(p.at),
      matchStatus: 'matched',
      matchedUserId: p.userId,
      matchedAt: new Date(p.at),
      createdAt: new Date(p.at),
      raw: { fixture: 'revenue-sharing', periodId: p.id },
    })),
  });
  await tx.membershipFeePeriod.createMany({
    data: revenueDemoPeriods.map((p) => ({
      id: p.id,
      userId: p.userId,
      startsAt: new Date(p.at),
      endsAt: new Date(p.until),
      amount: p.amount,
      source: 'transfer',
      paymentTransactionId: p.paymentId,
      createdAt: new Date(p.at),
    })),
  });
  await tx.revenueCustomer.createMany({
    data: revenueDemoPeople.map((p) => ({
      userId: p.id,
      firstReceivedAt: new Date(p.first),
    })),
  });
  await seedRevenueDemoReferrals(tx);
}

async function seedRevenueDemoReferrals(tx: DbTx): Promise<void> {
  const { defaultRate: rate } = await tx.affiliatePolicy.findUniqueOrThrow({
    where: { id: 1 },
    select: { defaultRate: true },
  });
  await tx.affiliate.createMany({
    data: revenueDemoPeople.map((p) => ({
      id: `affiliate-${p.id}`,
      userId: p.id,
      code: p.code,
      rate,
      createdAt: new Date(p.first),
    })),
  });
  const referred = revenueDemoPeople.filter((p) => p.referred);
  await tx.referral.createMany({
    data: referred.map((p) => ({
      id: `referral-${p.id}`,
      affiliateId: `affiliate-${REVENUE_DEMO.agentId}`,
      affiliateCode: REVENUE_DEMO.code,
      referredUserId: p.id,
      status: 'converted',
      monthKey: p.first.slice(0, 7),
      createdAt: new Date(p.first),
      convertedAt: new Date(p.first),
    })),
  });
  await tx.commission.createMany({
    data: referred.map((p) => ({
      id: `commission-${p.id}`,
      affiliateId: `affiliate-${REVENUE_DEMO.agentId}`,
      referredUserId: p.id,
      feePeriodId: `${p.id}-period-0`,
      listAmount: p.amount,
      plan: p.plan,
      amount: Math.round((p.amount * rate) / 100),
      rate,
      monthKey: p.first.slice(0, 7),
      createdAt: new Date(p.first),
    })),
  });
  const group = await tx.group.findFirstOrThrow({
    where: { kind: 'province', province: REVENUE_DEMO.province, deletedAt: null },
    select: { id: true },
  });
  await tx.groupMember.create({
    data: {
      userId: REVENUE_DEMO.agentId,
      groupId: group.id,
      status: 'member',
      createdAt: new Date('2022-09-15T03:00:00Z'),
    },
  });
  await tx.group.update({ where: { id: group.id }, data: { memberCount: { increment: 1 } } });
}
