import { Prisma } from '@opchub/db';
import type { MyRegionAffiliateCursor, RegionalRegion } from '@opchub/shared/api-domains';
import { earliestRegionalGroup } from './earliest-group.sql';

/** Aggregate order is preserved: share DESC, display name ASC, immutable affiliate id ASC.
 * Scope is index-covered; wide/display province reads happen only after keyset LIMIT.
 * Aggregate ranks must be calculated, not falsely described as a seek on precomputed totals.
 */
export function myRegionAffiliatesQuery(
  region: RegionalRegion,
  userId: string,
  cursor: MyRegionAffiliateCursor | undefined,
  limit: number,
) {
  const after = cursor
    ? Prisma.sql`WHERE g.share < ${BigInt(cursor.share)} OR
    (g.share = ${BigInt(cursor.share)} AND (g.name,g.id) > (${cursor.name},${cursor.id}))`
    : Prisma.empty;
  return Prisma.sql`
    WITH grouped AS (
      SELECT s.affiliate_id AS id,count(DISTINCT s.customer_id)::int AS customers,
        sum(s.base_amount)::bigint AS revenue,sum(s.director_amount)::bigint AS share
      FROM regional_shares s
      WHERE s.region=${region}::region AND s.director_user_id=${userId} AND s.region IS NOT NULL
      GROUP BY s.affiliate_id
    ), named AS (
      SELECT g.*,COALESCE(u.full_name,'Thành viên đã xóa') AS name
      FROM grouped g
      LEFT JOIN LATERAL (SELECT user_id FROM affiliates WHERE id=g.id LIMIT 1) a ON true
      LEFT JOIN LATERAL (SELECT full_name FROM users WHERE id=a.user_id LIMIT 1) u ON true
    ), page AS (
      SELECT g.*,count(*) OVER ()::int AS total FROM named g ${after}
      ORDER BY g.share DESC,g.name,g.id LIMIT ${limit}
    )
    SELECT p.*,COALESCE(a.code,'') AS code,COALESCE(province.province_name,'') AS province
    FROM page p LEFT JOIN LATERAL (SELECT user_id,code FROM affiliates WHERE id=p.id LIMIT 1) a ON true
    LEFT JOIN LATERAL (${earliestRegionalGroup(Prisma.sql`a.user_id`)}) province ON true
    ORDER BY p.share DESC,p.name,p.id`;
}
