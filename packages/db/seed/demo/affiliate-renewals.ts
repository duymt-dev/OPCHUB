import { commissionRateFor, payoutMonthOf, regionalPercent, regionalAmount } from '@opchub/shared';
import type { DbTx } from '../../src/client';

/** D-131 synthetic demo history only: actual period IDs, two renewal rows, no year-four row. */
export async function seedAffiliateRenewals(tx: DbTx) {
  const source = await renewalSource(tx);
  if (!source || source.plan === 'fundraising') return;
  const [anchor, policy] = await Promise.all([
    tx.customerYear.findUniqueOrThrow({
      where: { userId: source.customerId },
      select: { firstPaidAt: true },
    }),
    tx.affiliatePolicy.findUniqueOrThrow({ where: { id: 1 } }),
  ]);
  const periods = renewalPeriods(anchor.firstPaidAt);
  await tx.membershipFeePeriod.createMany({
    data: periods.map((p) => ({
      id: p.id,
      userId: source.customerId,
      startsAt: p.at,
      endsAt: p.end,
      createdAt: p.at,
      amount: source.baseAmount,
      source: 'transfer' as const,
    })),
    skipDuplicates: true,
  });
  await tx.commission.createMany({
    data: periods.flatMap((p) => {
      const rate = commissionRateFor(p.year, { ...policy, firstYearRate: policy.defaultRate });
      return rate === null
        ? []
        : [
            {
              id: `commission-${p.id}`,
              affiliateId: source.affiliateId,
              referredUserId: source.customerId,
              feePeriodId: p.id,
              listAmount: source.baseAmount,
              plan: source.plan,
              customerYear: p.year,
              rate,
              amount: Math.round((source.baseAmount * rate) / 100),
              monthKey: payoutMonthOf(p.at),
              createdAt: p.at,
            },
          ];
    }),
    skipDuplicates: true,
  });
  await tx.regionalShare.createMany({
    data: periods.map((p) => {
      const percent = regionalPercent(p.year, policy);
      return {
        id: `regional-${p.id}`,
        source: 'membership' as const,
        sourceId: p.id,
        customerId: source.customerId,
        affiliateId: source.affiliateId,
        affiliateUserId: source.affiliateUserId,
        region: source.region,
        directorUserId: source.directorUserId,
        plan: source.plan,
        baseAmount: source.baseAmount,
        customerYear: p.year,
        percent,
        ...regionalAmount(source.baseAmount, percent),
        monthKey: payoutMonthOf(p.at),
        recordedAt: p.at,
      };
    }),
    skipDuplicates: true,
  });
}

function renewalPeriods(firstPaidAt: Date) {
  return [2, 3, 4].map((year) => {
    const at = new Date(firstPaidAt);
    at.setUTCFullYear(at.getUTCFullYear() + year - 1);
    const end = new Date(at);
    end.setUTCFullYear(end.getUTCFullYear() + 1);
    return { year, at, end, id: `demo-reference-year-${year}` };
  });
}

function renewalSource(tx: DbTx) {
  return tx.regionalShare.findFirst({
    where: { source: 'membership', region: { not: null } },
    orderBy: { id: 'asc' },
    select: {
      affiliateId: true,
      affiliateUserId: true,
      region: true,
      directorUserId: true,
      customerId: true,
      plan: true,
      baseAmount: true,
    },
  });
}
