import { Prisma } from '@opchub/db';
import type { RevenuePayoutHistoryQuery } from '@opchub/shared/api-domains';

/** Covering cursor selection before fetching bank/name payloads. */
export const revenuePayoutHistoryQuery = (q: RevenuePayoutHistoryQuery) => Prisma.sql`
  SELECT p.id, p.director_id AS "directorId", p.director_name AS "directorName", p.region,
    p.month_key AS "monthKey", p.amount, p.share_count AS "shareCount",
    p.bank_name AS "bankName", p.bank_no AS "bankNo", p.bank_holder AS "bankHolder",
    p.paid_by AS "paidBy", p.paid_at AS "paidAt"
  FROM (
    SELECT id, paid_at FROM revenue_payouts WHERE TRUE
      ${q.directorId ? Prisma.sql`AND director_id = ${q.directorId}` : Prisma.empty}
      ${q.beforeAt && q.beforeId ? Prisma.sql`AND (paid_at, id) < (${new Date(q.beforeAt)}, ${q.beforeId})` : Prisma.empty}
    ORDER BY paid_at DESC, id DESC LIMIT ${q.size + 1}
  ) page JOIN revenue_payouts p ON p.id = page.id
  ORDER BY page.paid_at DESC, page.id DESC`;
