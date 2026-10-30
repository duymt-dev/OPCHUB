import { affiliateDemoAgents, affiliateDemoCustomers, members } from '@opchub/shared/fixtures';
import type { DbTx } from '../../src/client';
import { buildFees, DAY_MS } from '@opchub/shared/mock-domains';

/** Existing demo paid periods become traceable bank receipts, not new entitlements. */
export async function seedDemoRevenueBaseline(tx: DbTx): Promise<void> {
  await seedHistoricalPeriods(tx);
  const periodIds = [
    ...new Set([
      ...members.map((row) => row.id),
      ...affiliateDemoAgents.map((row) => row.userId),
      ...affiliateDemoCustomers.map((row) => row.userId),
    ]),
  ].map((id) => `demo-fee-${id}`);
  const periods = await tx.membershipFeePeriod.findMany({
    where: {
      id: { in: periodIds },
      amount: { gt: 0 },
      source: 'transfer',
      paymentTransactionId: null,
    },
    select: {
      id: true,
      userId: true,
      amount: true,
      createdAt: true,
      user: { select: { memberCode: true } },
    },
  });
  await tx.paymentTransaction.createMany({
    data: periods.map((row) => ({
      id: `demo-receipt-${row.id}`,
      provider: 'demo',
      bankTxnId: row.id,
      amount: row.amount,
      content: `OPCHUB ${row.user.memberCode}`,
      receivedAt: row.createdAt,
      matchedAt: row.createdAt,
      matchStatus: 'matched' as const,
      matchedUserId: row.userId,
      raw: { fixture: 'paid-demo-period', periodId: row.id },
      createdAt: row.createdAt,
    })),
  });
  await tx.$executeRaw`
    UPDATE membership_fee_periods f
    SET payment_transaction_id = p.id
    FROM payment_transactions p
    WHERE f.id = ANY(${periods.map((row) => row.id)}::text[])
      AND p.id = 'demo-receipt-' || f.id AND f.payment_transaction_id IS NULL`;
  // Select only known fixture periods by PK; renewal starts_at is not the receipt time.
  await tx.$executeRaw`
    INSERT INTO revenue_customers (user_id, first_received_at)
    SELECT f.user_id, MIN(p.received_at)
    FROM membership_fee_periods f
    JOIN payment_transactions p ON p.id = f.payment_transaction_id
    WHERE f.id = ANY(${periodIds}::text[])
      AND f.amount > 0 AND p.amount > 0 AND p.match_status IN ('matched', 'manual')
    GROUP BY f.user_id
    ON CONFLICT (user_id) DO UPDATE SET
      first_received_at = LEAST(revenue_customers.first_received_at, EXCLUDED.first_received_at)`;
}

/** An expired subscription still has a real historical receipt (not a new collection). */
async function seedHistoricalPeriods(tx: DbTx): Promise<void> {
  await tx.membershipFeePeriod.createMany({
    data: buildFees().flatMap((fee) =>
      fee.paidAt && fee.amount > 0
        ? [
            {
              id: `demo-fee-${fee.userId}`,
              userId: fee.userId,
              startsAt: new Date(fee.paidAt),
              endsAt: new Date(Date.parse(fee.paidAt) + 365 * DAY_MS),
              amount: fee.amount,
              source: 'transfer' as const,
              createdAt: new Date(fee.paidAt),
            },
          ]
        : [],
    ),
    skipDuplicates: true,
  });
}
