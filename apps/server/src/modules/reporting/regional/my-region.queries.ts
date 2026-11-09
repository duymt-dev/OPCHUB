import { myRegionAffiliatesQuery } from './my-region-affiliates.query';
import { Prisma } from '@opchub/db';
import type { RegionalRegion } from '@opchub/shared/api-domains';

export function myRegionQueries(region: RegionalRegion, userId: string) {
  const scope = Prisma.sql`s.region=${region}::region AND s.director_user_id=${userId} AND s.region IS NOT NULL`;
  return {
    kpi: Prisma.sql`SELECT count(*)::int AS count,
      COALESCE(sum(s.base_amount),0)::bigint AS revenue,
      COALESCE(sum(s.director_amount),0)::bigint AS share,
      COALESCE(sum(s.director_amount) FILTER (WHERE s.status='paid'),0)::bigint AS paid,
      count(DISTINCT s.month_key) FILTER (WHERE s.status='paid')::int AS "paidMonths"
      FROM regional_shares s WHERE ${scope}`,
    years: Prisma.sql`SELECT LEAST(s.customer_year,4)::int AS year,count(*)::int AS count,
      sum(s.base_amount)::bigint AS revenue,sum(s.director_amount)::bigint AS share
      FROM regional_shares s WHERE ${scope} GROUP BY LEAST(s.customer_year,4)`,
    affiliates: myRegionAffiliatesQuery(region, userId, undefined, 50),
    months: Prisma.sql`SELECT s.month_key AS "monthKey",sum(s.director_amount)::bigint AS amount,
      CASE WHEN bool_and(s.status='paid') THEN 'paid' ELSE 'pending' END AS status,
      max(p.paid_at) AS "paidAt" FROM regional_shares s
      LEFT JOIN regional_payouts p ON p.id=s.payout_id
      WHERE ${scope} GROUP BY s.month_key ORDER BY s.month_key DESC LIMIT 24`,
  };
}
