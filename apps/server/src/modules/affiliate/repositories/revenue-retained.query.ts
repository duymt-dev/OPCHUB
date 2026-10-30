import { Prisma } from '@opchub/db';

/** Reserved Affiliate read-model metric; never aggregate the whole receipt ledger per request. */
export const revenueRetainedQuery = () => Prisma.sql`
  SELECT
    COALESCE(sum(value) FILTER (WHERE dimension = 'all'), 0)::text AS "allReceipts",
    COALESCE(sum(value) FILTER (WHERE dimension = 'attributed'), 0)::text AS "affiliateAttributed"
  FROM stats_daily
  WHERE metric = 'affiliate_revenue_retained' AND dimension IN ('all', 'attributed')`;
