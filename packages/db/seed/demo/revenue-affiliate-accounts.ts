import {
  AFFILIATE_REVENUE_APPOINTED_AT,
  affiliateRevenueCustomers,
  affiliateRevenueOwners,
  PRICE_DEFAULTS,
} from '@opchub/shared/fixtures';
import { planAmountOf } from '@opchub/shared';
import { Prisma, type DbTx } from '../../src/index';

const people = [
  ...affiliateRevenueCustomers.map((p) => ({ ...p, amount: planAmountOf(PRICE_DEFAULTS, p.plan) })),
  ...affiliateRevenueOwners.map((p) => ({
    ...p,
    amount: planAmountOf(PRICE_DEFAULTS, 'personal'),
  })),
];

/** Demo reset only: create traceable first receipts, never infer age from registration. */
export async function seedAffiliateRevenueAccounts(tx: DbTx): Promise<void> {
  const dates = Prisma.join([
    ...people.map((p) => Prisma.sql`(${p.userId}, ${new Date(p.registeredAt)})`),
    Prisma.sql`('m3', ${new Date(Date.parse(AFFILIATE_REVENUE_APPOINTED_AT) - 86400000)})`,
  ]);
  await tx.$executeRaw`
    UPDATE users u SET created_at = LEAST(u.created_at, v.at::timestamptz),
      email_verified_at = LEAST(u.email_verified_at, v.at::timestamptz),
      declared_at = LEAST(u.declared_at, v.at::timestamptz)
    FROM (VALUES ${dates}) v(id, at) WHERE u.id = v.id`;
  await tx.$executeRaw`
    UPDATE membership_fees f SET created_at = LEAST(f.created_at, v.at::timestamptz)
    FROM (VALUES ${dates}) v(id, at) WHERE f.user_id = v.id`;
  await tx.$executeRaw`
    UPDATE affiliates a SET created_at = LEAST(a.created_at, v.at::timestamptz)
    FROM (VALUES ${dates}) v(id, at) WHERE a.user_id = v.id`;
  await seedFirstReceipts(tx);
  await seedReferralChronology(tx);
  await seedAffiliateRevenueProvinces(tx);
}

async function seedFirstReceipts(tx: DbTx): Promise<void> {
  const historical = people.filter((p) => !('paidAt' in p) || p.firstReceivedAt < p.paidAt);
  const users = await tx.user.findMany({
    where: { id: { in: historical.map((p) => p.userId) } },
    select: { id: true, memberCode: true },
  });
  const codes = new Map(users.map((u) => [u.id, u.memberCode]));
  if (historical.some((p) => !codes.has(p.userId))) throw new Error('Missing AF0 payer');
  await tx.paymentTransaction.createMany({
    data: historical.map((p) => ({
      id: p.historicalPaymentId,
      provider: 'demo',
      bankTxnId: p.historicalPaymentId,
      amount: p.amount,
      content: `OPCHUB ${codes.get(p.userId)}`,
      receivedAt: new Date(p.firstReceivedAt),
      matchedAt: new Date(p.firstReceivedAt),
      matchStatus: 'matched',
      matchedUserId: p.userId,
      createdAt: new Date(p.firstReceivedAt),
      raw: { fixture: 'af0-first-receipt', periodId: p.historicalPeriodId },
    })),
  });
  await tx.membershipFeePeriod.createMany({
    data: historical.map((p) => ({
      id: p.historicalPeriodId,
      userId: p.userId,
      amount: p.amount,
      startsAt: new Date(p.firstReceivedAt),
      endsAt: new Date(`${Number(p.firstReceivedAt.slice(0, 4)) + 1}${p.firstReceivedAt.slice(4)}`),
      source: 'transfer',
      paymentTransactionId: p.historicalPaymentId,
      createdAt: new Date(p.firstReceivedAt),
    })),
  });
  const epochs = Prisma.join(
    people.map((p) => Prisma.sql`(${p.userId}, ${new Date(p.firstReceivedAt)})`),
  );
  await tx.$executeRaw`
    INSERT INTO revenue_customers (user_id, first_received_at)
    SELECT v.id, v.at::timestamptz FROM (VALUES ${epochs}) v(id, at)
    ON CONFLICT (user_id) DO UPDATE SET
      first_received_at = LEAST(revenue_customers.first_received_at, EXCLUDED.first_received_at)`;
}

async function seedReferralChronology(tx: DbTx): Promise<void> {
  const rows = Prisma.join(
    affiliateRevenueCustomers.map(
      (c) => Prisma.sql`(
    ${c.userId}, ${new Date(c.registeredAt)}, ${new Date(c.firstReceivedAt)},
    ${c.firstReceivedAt.slice(0, 7)}, ${c.status === 'cancelled' ? 'void' : 'converted'})`,
    ),
  );
  await tx.$executeRaw`
    UPDATE referrals r SET created_at = v.registered::timestamptz,
      converted_at = v.first::timestamptz, month_key = v.month,
      status = v.status::referral_status
    FROM (VALUES ${rows}) v(id, registered, first, month, status)
    WHERE r.referred_user_id = v.id`;
}

/** Earliest current province membership selects the region; no manual affiliate-region field. */
async function seedAffiliateRevenueProvinces(tx: DbTx): Promise<void> {
  const groups = await tx.group.findMany({
    where: {
      kind: 'province',
      province: { in: [...new Set(affiliateRevenueOwners.map((a) => a.province))] },
      deletedAt: null,
    },
    select: { id: true, province: true },
  });
  const rows = affiliateRevenueOwners.map((owner) => {
    const group = groups.find((g) => g.province === owner.province);
    if (!group) throw new Error('Missing AF0 province group');
    return { groupId: group.id, userId: owner.userId, createdAt: new Date('2026-07-31T00:00:00Z') };
  });
  const existing = await tx.groupMember.findMany({
    where: { userId: { in: rows.map((r) => r.userId) }, groupId: { in: groups.map((g) => g.id) } },
    select: { groupId: true, userId: true, status: true },
  });
  const values = Prisma.join(
    rows.map((r) => Prisma.sql`(${r.groupId}, ${r.userId}, ${r.createdAt})`),
  );
  await tx.$executeRaw`
    INSERT INTO group_members (group_id, user_id, created_at, updated_at)
    SELECT v.gid, v.uid, v.at::timestamptz, v.at::timestamptz FROM (VALUES ${values}) v(gid, uid, at)
    ON CONFLICT (group_id, user_id) DO UPDATE SET
      created_at = EXCLUDED.created_at, status = 'member'`;
  // Regenerated AF0 history: other province joins followed the primary one.
  // Preserve those memberships and roles instead of removing access.
  await tx.$executeRaw`
    UPDATE group_members m SET created_at = v.at::timestamptz + INTERVAL '1 day'
    FROM groups g, (VALUES ${values}) v(gid, uid, at)
    WHERE m.user_id = v.uid AND m.group_id = g.id AND g.kind = 'province'
      AND m.group_id <> v.gid AND m.created_at <= v.at::timestamptz`;
  const counts = Prisma.join(
    groups.map(
      (g) =>
        Prisma.sql`(${g.id}, ${
          rows.filter(
            (r) =>
              r.groupId === g.id &&
              !existing.some(
                (e) => e.groupId === r.groupId && e.userId === r.userId && e.status === 'member',
              ),
          ).length
        })`,
    ),
  );
  await tx.$executeRaw`
    UPDATE groups g SET member_count = g.member_count + v.delta::int
    FROM (VALUES ${counts}) v(id, delta) WHERE g.id = v.id`;
}
