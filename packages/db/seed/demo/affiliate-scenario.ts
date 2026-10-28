import {
  AFFILIATE_DEMO_DAY,
  AFFILIATE_PAUSED_START,
  AFFILIATE_PAUSED_END,
  affiliateDemoAgents as agents,
  affiliateDemoCustomers as customers,
  affiliateDemoPaidAt,
  affiliateDemoStartedAt,
} from '@opchub/shared/fixtures';
import { planAmountOf } from '@opchub/shared';
import { PRICE_DEFAULTS } from '@opchub/shared/fixtures';
import type { DbTx } from '../../src/client';
import { ADMIN_ID } from './people';
import { seedAffiliatePayoutScenario } from './affiliate-payout-scenario';

const YEAR = 365 * 86_400_000;
/** BR-AFF-REV (v4.2 `feeOf(type)`): phí năm theo gói thực trả của từng khách AF0, giá mặc định */
const feeOf = (plan: 'personal' | 'business') => planAmountOf(PRICE_DEFAULTS, plan);
const owners = agents.filter((a) => a.userId !== 'm1');
const endOfPeriod = (start: string) => new Date(Date.parse(start) + YEAR);

/**
 * Additive AF0 scenario after seed:demo, in one transaction. Separate from the eight-member
 * base scenario: AF0 adds real paid users, hence changes member/fee/affiliate totals (AF-R01).
 * Never hide those users or omit their own automatic affiliate just to match a screenshot.
 */
async function seedScenarioUsers(tx: DbTx): Promise<void> {
  const member = await tx.user.findUniqueOrThrow({
    where: { id: 'm1' },
    select: { passwordHash: true },
  });
  await tx.user.createMany({
    data: [
      ...owners.map((a, i) => ({
        id: a.userId,
        memberCode: `TV${850001 + i}`,
        fullName: a.name,
        email: a.email,
        accountType: 'personal' as const,
        passwordHash: member.passwordHash,
        emailVerifiedAt: new Date(affiliateDemoStartedAt(a.id)),
        declaredAt: new Date(affiliateDemoStartedAt(a.id)),
        createdAt: new Date(affiliateDemoStartedAt(a.id)),
      })),
      ...customers.map((c, i) => ({
        id: c.userId,
        memberCode: `TV${860001 + i}`,
        fullName: c.name,
        email: `${c.userId}@demo.opchub.invalid`,
        accountType: c.plan,
        emailVerifiedAt: new Date(c.paidAt),
        declaredAt: new Date(c.paidAt),
        createdAt: new Date(c.paidAt),
      })),
    ],
    skipDuplicates: true,
  });
}

async function seedScenarioFees(tx: DbTx): Promise<void> {
  const fees = [
    ...owners.map((a) => ({
      userId: a.userId,
      start: affiliateDemoStartedAt(a.id),
      plan: 'personal' as const,
    })),
    ...customers.map((c) => ({ userId: c.userId, start: c.paidAt, plan: c.plan })),
  ];
  await tx.membershipFee.createMany({
    data: fees.map((f) => ({
      userId: f.userId,
      status: 'active' as const,
      plan: f.plan,
      amount: feeOf(f.plan),
      paidAt: new Date(f.start),
      validUntil: endOfPeriod(f.start),
      createdAt: new Date(f.start),
    })),
    skipDuplicates: true,
  });
  await tx.membershipFeePeriod.createMany({
    data: fees.map((f) => ({
      id: `demo-fee-${f.userId}`,
      userId: f.userId,
      startsAt: new Date(f.start),
      endsAt: endOfPeriod(f.start),
      amount: feeOf(f.plan),
      source: 'transfer' as const,
      createdAt: new Date(f.start),
    })),
    skipDuplicates: true,
  });
  // The base m1 fee starts in October; AF0 attributes August payments. Use a coherent
  // historical first period in this scenario rather than create overlapping fake periods.
  const start = affiliateDemoStartedAt('a1');
  await tx.membershipFee.update({
    where: { userId: 'm1' },
    data: { paidAt: new Date(start), validUntil: endOfPeriod(start) },
  });
  await tx.membershipFeePeriod.update({
    where: { id: 'demo-fee-m1' },
    data: { startsAt: new Date(start), endsAt: endOfPeriod(start), createdAt: new Date(start) },
  });
  await tx.affiliate.update({
    where: { userId: 'm1' },
    data: { createdAt: new Date(start) },
  });
}

async function seedScenarioAgents(tx: DbTx): Promise<void> {
  await tx.affiliate.createMany({
    data: [
      ...owners.map((a) => ({
        id: a.id,
        userId: a.userId,
        code: a.code,
        rate: a.rate,
        ...a.bank,
        createdAt: new Date(affiliateDemoStartedAt(a.id)),
      })),
      // Every referred member paid too. They must have their own affiliate (AF-R01).
      ...customers.map((c, i) => ({
        id: `demo-affiliate-${c.userId}`,
        userId: c.userId,
        code: `AFDEMO${String(i + 1).padStart(4, '0')}`,
        rate: 20,
        createdAt: new Date(c.paidAt),
      })),
    ],
    skipDuplicates: true,
  });
}

async function seedScenarioCommissions(tx: DbTx): Promise<void> {
  await tx.referral.createMany({
    data: customers.map((c) => ({
      id: `demo-referral-${c.id}`,
      affiliateId: c.affiliateId,
      affiliateCode: requireAgent(c.affiliateId).code,
      referredUserId: c.userId,
      status: 'converted' as const,
      monthKey: c.month,
      createdAt: new Date(c.paidAt),
      convertedAt: new Date(c.paidAt),
    })),
    skipDuplicates: true,
  });
  await tx.commission.createMany({
    data: customers.map((c) => {
      const a = requireAgent(c.affiliateId);
      return {
        id: `demo-commission-${c.id}`,
        affiliateId: a.id,
        referredUserId: c.userId,
        feePeriodId: `demo-fee-${c.userId}`,
        listAmount: feeOf(c.plan),
        // D-110: gói thực trả (snapshot) như prototype v4.2 C0
        plan: c.plan,
        amount: Math.round((feeOf(c.plan) * a.rate) / 100),
        rate: a.rate,
        status: c.status,
        monthKey: c.month,
        createdAt: new Date(c.paidAt),
        ...(c.status === 'paid'
          ? {
              paidAt: new Date(affiliateDemoPaidAt(c.month)),
              paidBy: ADMIN_ID,
              paidBankSnapshot: a.bank,
            }
          : {}),
        ...(c.status === 'cancelled'
          ? {
              cancelReason: 'Thông tin giới thiệu không hợp lệ (dữ liệu demo)',
              cancelledAt: new Date(c.paidAt),
              cancelledBy: ADMIN_ID,
            }
          : {}),
      };
    }),
    skipDuplicates: true,
  });
}

export async function seedAffiliateScenario(
  tx: DbTx,
  options: { paused?: boolean; payout?: boolean } = {},
): Promise<void> {
  await seedScenarioUsers(tx);
  await seedScenarioFees(tx);
  await seedScenarioAgents(tx);
  await seedScenarioCommissions(tx);
  await tx.affiliateClickDaily.createMany({
    data: agents.map((a) => ({
      affiliateId: a.id,
      day: new Date(`${AFFILIATE_DEMO_DAY}T00:00:00Z`),
      count: a.clicks,
    })),
    skipDuplicates: true,
  });
  if (options.paused) await seedPausedAffiliate(tx);
  if (options.payout) await seedAffiliatePayoutScenario(tx);
}

async function seedPausedAffiliate(tx: DbTx): Promise<void> {
  await tx.user.update({
    where: { id: 'af-owner-a3' },
    data: {
      createdAt: new Date(AFFILIATE_PAUSED_START),
      emailVerifiedAt: new Date(AFFILIATE_PAUSED_START),
    },
  });
  await tx.membershipFee.update({
    where: { userId: 'af-owner-a3' },
    data: {
      status: 'expired',
      paidAt: new Date(AFFILIATE_PAUSED_START),
      validUntil: new Date(AFFILIATE_PAUSED_END),
    },
  });
  await tx.membershipFeePeriod.update({
    where: { id: 'demo-fee-af-owner-a3' },
    data: {
      startsAt: new Date(AFFILIATE_PAUSED_START),
      endsAt: new Date(AFFILIATE_PAUSED_END),
      createdAt: new Date(AFFILIATE_PAUSED_START),
    },
  });
  await tx.affiliate.update({ where: { id: 'a3' }, data: { status: 'paused' } });
}

const requireAgent = (id: string) => {
  const a = agents.find((a) => a.id === id);
  if (!a) throw new Error('Unknown affiliate demo owner');
  return a;
};
