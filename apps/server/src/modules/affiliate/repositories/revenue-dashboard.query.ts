import { Prisma } from '@opchub/db';
import type { RevenueFormerQuery } from '@opchub/shared/api-domains';

/** One batched, beneficiary-filtered aggregation; the grouping-set row deduplicates affiliates. */
export const revenueDashboardStatsQuery = (ids: string[]) => Prisma.sql`
  SELECT director_id AS "directorId", count(*)::text AS "receiptCount",
    count(DISTINCT affiliate_id)::text AS "affiliateCount",
    coalesce(sum(amount), 0)::text AS received,
    coalesce(sum(director_amount), 0)::text AS allocated,
    coalesce(sum(director_amount) FILTER (WHERE status = 'paid'), 0)::text AS paid,
    coalesce(sum(director_amount) FILTER (WHERE status = 'recorded'), 0)::text AS due,
    coalesce(sum(media_soft_amount), 0)::text AS "mediaSoft"
  FROM revenue_shares WHERE director_id = ANY(${ids}::text[])
  GROUP BY GROUPING SETS ((director_id), ())`;

/** Bank owner IDs are durable on revocation. Page IDs first; never list every historical share. */
export const revenueFormerQuery = (q: RevenueFormerQuery) => Prisma.sql`
  SELECT b.director_id AS "directorId", b.bank_name AS "bankName",
    b.bank_no AS "bankNo", b.bank_holder AS "bankHolder", last.director_name AS name, last.region
  FROM (
    SELECT b.director_id, latest.id AS share_id FROM revenue_recipient_banks b
    JOIN LATERAL (
      SELECT s.id FROM revenue_shares s WHERE s.director_id = b.director_id
      ORDER BY s.received_at DESC, s.id DESC LIMIT 1
    ) latest ON TRUE
    WHERE NOT EXISTS (SELECT 1 FROM regional_directors d WHERE d.user_id = b.director_id)
      ${q.beforeId ? Prisma.sql`AND b.director_id < ${q.beforeId}` : Prisma.empty}
    ORDER BY b.director_id DESC LIMIT ${q.size + 1}
  ) page JOIN revenue_recipient_banks b ON b.director_id = page.director_id
  JOIN revenue_shares last ON last.id = page.share_id
  ORDER BY page.director_id DESC`;
