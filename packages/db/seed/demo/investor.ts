import { buildInterests } from '@opchub/shared/mock-domains';
import type { DbTx } from '../../src/client';
import { requireUserId } from './people';

/**
 * Domain investor: quan tâm đầu tư (INV_SEED, id `<dự án>-i<n>` như mock) + tổng hợp
 * `investor_summaries` (gom theo user — Q-G5c-1). D-72: không trạng thái, không trao đổi.
 */

export async function seedInvestors(tx: DbTx): Promise<void> {
  const interests = buildInterests().map((i) => ({ ...i, userId: requireUserId(i.investorName) }));
  await tx.investorInterest.createMany({
    data: interests.map((i) => ({
      id: i.id,
      projectId: i.projectId,
      userId: i.userId,
      kind: i.kind,
      contactName: i.investorName,
      phone: i.phone,
      organization: i.organization,
      amount: BigInt(i.amount),
      currency: i.currency,
      message: i.message,
      investorKey: i.userId,
      createdAt: new Date(i.createdAt),
      updatedAt: new Date(i.createdAt),
    })),
  });
  // Tổng hợp theo người: một câu INSERT … SELECT như migration investor_summaries (không vòng lặp)
  await tx.$executeRaw`
    INSERT INTO investor_summaries (investor_key, user_id, first_interest_id, kind, organization, phone,
                                    total_amount, interest_count, last_at, updated_at)
    SELECT g.investor_key, l.user_id, g.first_id, l.kind, l.organization, l.phone,
           g.total_amount, g.n, g.last_at, now()
    FROM (
      SELECT investor_key,
             (array_agg(id ORDER BY created_at DESC, id DESC))[1] AS first_id,
             (array_agg(id ORDER BY created_at DESC, id DESC))[1] AS last_id,
             SUM(amount)::bigint AS total_amount, count(*)::int AS n, MAX(created_at) AS last_at
      FROM investor_interests GROUP BY investor_key
    ) g JOIN investor_interests l ON l.id = g.last_id`;
}
