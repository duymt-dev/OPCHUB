import {
  REGIONAL_DEMO_AFFILIATES,
  buildRegionalShareDemo,
  type RegionalDemoSource,
} from '@opchub/shared/mock-domains';
import type { DbTx } from '../../src/client';

/** Optional AF0's actual paid sources; no fabricated production ledger/backfill entries. */
export async function seedRegionalShares(tx: DbTx, now = new Date()) {
  const [sources, slots, groups, policy] = await Promise.all([
    tx.commission.findMany({
      where: { status: { not: 'cancelled' } },
      select: {
        source: true,
        feePeriodId: true,
        fundraisingId: true,
        referredUserId: true,
        affiliateId: true,
        listAmount: true,
        plan: true,
      },
    }),
    tx.regionalDirector.findMany({
      select: { region: true, userId: true, bankName: true, bankNo: true, bankHolder: true },
    }),
    tx.group.findMany({
      where: { kind: 'province', deletedAt: null },
      select: { id: true, province: true },
    }),
    tx.affiliatePolicy.findUniqueOrThrow({ where: { id: 1 } }),
  ]);
  if (!sources.length) return;
  const affiliates = REGIONAL_DEMO_AFFILIATES.filter((a) =>
    sources.some((s) => s.affiliateId === a.affiliateId),
  );
  await tx.groupMember.createMany({
    data: affiliates.flatMap((a) => {
      const group = groups.find((g) => g.province === a.province);
      return group ? [{ userId: a.userId, groupId: group.id, status: 'member' as const }] : [];
    }),
    skipDuplicates: true,
  });
  const inputs = sources
    .flatMap((s): RegionalDemoSource[] => {
      const agent = affiliates.find((a) => a.affiliateId === s.affiliateId);
      const slot = slots.find((r) => r.region === agent?.region);
      const sourceId = s.feePeriodId ?? s.fundraisingId;
      return agent && slot?.userId && sourceId && s.listAmount > 0
        ? [
            {
              source: s.source,
              sourceId,
              customerId: s.referredUserId,
              affiliateId: s.affiliateId,
              affiliateUserId: agent.userId,
              region: agent.region,
              directorUserId: slot.userId,
              baseAmount: s.listAmount,
              plan: s.plan,
            },
          ]
        : [];
    })
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  const rows = buildRegionalShareDemo(inputs, policy, now);
  await persistRegionalDemo(tx, rows, slots, now);
}

async function persistRegionalDemo(
  tx: DbTx,
  rows: ReturnType<typeof buildRegionalShareDemo>,
  slots: {
    region: RegionalDemoSource['region'];
    bankName: string | null;
    bankNo: string | null;
    bankHolder: string | null;
  }[],
  now: Date,
) {
  await tx.customerYear.createMany({
    data: rows.map((r) => ({
      userId: r.customerId,
      firstPaidAt: r.firstPaidAt,
      source: r.source,
      sourceId: r.sourceId,
    })),
    skipDuplicates: true,
  });
  const paid = rows.find((r) => r.paid);
  if (paid) {
    const slot = slots.find((s) => s.region === paid.region);
    await tx.regionalPayout.create({
      data: {
        id: 'regional-demo-payout',
        region: paid.region,
        directorUserId: paid.directorUserId,
        monthKeys: [paid.monthKey],
        amount: paid.directorAmount,
        count: 1,
        bankSnapshot: {
          bankName: slot?.bankName ?? '',
          bankNo: slot?.bankNo ?? '',
          bankHolder: slot?.bankHolder ?? '',
        },
        paidBy: 'admin',
        paidAt: new Date(now),
      },
    });
  }
  await tx.regionalShare.createMany({
    data: rows.map(ledgerRow),
    skipDuplicates: true,
  });
}

function ledgerRow(r: ReturnType<typeof buildRegionalShareDemo>[number]) {
  return {
    id: r.id,
    source: r.source,
    sourceId: r.sourceId,
    customerId: r.customerId,
    affiliateId: r.affiliateId,
    affiliateUserId: r.affiliateUserId,
    region: r.region,
    directorUserId: r.directorUserId,
    plan: r.plan,
    baseAmount: r.baseAmount,
    customerYear: r.customerYear,
    percent: r.percent,
    directorAmount: r.directorAmount,
    mediaSoftAmount: r.mediaSoftAmount,
    monthKey: r.monthKey,
    recordedAt: r.recordedAt,
    status: r.paid ? ('paid' as const) : ('pending' as const),
    payoutId: r.paid ? 'regional-demo-payout' : null,
  };
}
