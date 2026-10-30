import { Prisma } from '@opchub/db';
import type { RevenueLedgerQuery, RevenueMonthsQuery } from '@opchub/shared/api-domains';

/** Equality before the time cursor; only fetch financial payloads for the selected IDs. */
export const revenueLedgerQuery = (directorId: string, q: RevenueLedgerQuery) => Prisma.sql`
  SELECT s.id, s.customer_id AS "customerId", s.affiliate_id AS "affiliateId", s.plan,
    s.received_at AS "receivedAt", s.recorded_at AS "recordedAt",
    s.first_received_at AS "firstReceivedAt", s.customer_year AS "customerYear",
    s.amount, s.director_rate AS "directorRate", s.director_amount AS "directorAmount",
    s.media_soft_amount AS "mediaSoftAmount", s.month_key AS "monthKey", s.status,
    s.payout_id AS "payoutId"
  FROM (
    SELECT id, received_at FROM revenue_shares WHERE director_id = ${directorId}
      ${q.beforeAt && q.beforeId ? Prisma.sql`AND (received_at, id) < (${new Date(q.beforeAt)}, ${q.beforeId})` : Prisma.empty}
    ORDER BY received_at DESC, id DESC LIMIT ${q.size + 1}
  ) page JOIN revenue_shares s ON s.id = page.id
  ORDER BY page.received_at DESC, page.id DESC`;

// Filtered per beneficiary, using a covering index. No global COUNT(*)/ledger scan per request.
const totals = Prisma.sql`
  count(*)::text AS "receiptCount", coalesce(sum(amount), 0)::text AS received,
  coalesce(sum(director_amount), 0)::text AS allocated,
  coalesce(sum(director_amount) FILTER (WHERE status = 'paid'), 0)::text AS paid,
  coalesce(sum(director_amount) FILTER (WHERE status = 'recorded'), 0)::text AS due,
  coalesce(sum(media_soft_amount), 0)::text AS "mediaSoft"`;

export const revenueBalanceQuery = (directorId: string) => Prisma.sql`
  SELECT ${totals} FROM revenue_shares WHERE director_id = ${directorId}`;

export const revenueMonthsQuery = (directorId: string, q: RevenueMonthsQuery) => Prisma.sql`
  SELECT month_key AS "monthKey", ${totals}
  FROM revenue_shares WHERE director_id = ${directorId}
    ${q.beforeMonth ? Prisma.sql`AND month_key < ${q.beforeMonth}` : Prisma.empty}
  GROUP BY month_key ORDER BY month_key DESC LIMIT ${q.size + 1}`;
