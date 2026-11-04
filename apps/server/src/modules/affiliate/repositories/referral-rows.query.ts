import { Prisma } from '@opchub/db';
import type { AffiliatePageQuery } from '@opchub/shared/api-domains';

/** Select narrow, stable source IDs first; each commission is one Portal row (D-131). */
export function referralIds(affiliateId: string, q: Pick<AffiliatePageQuery, 'month'>) {
  return Prisma.sql`SELECT c.id,c.created_at AS date,'commission' AS kind FROM commissions c
    WHERE c.affiliate_id=${affiliateId} ${q.month ? Prisma.sql`AND c.month_key=${q.month}` : Prisma.empty}
    UNION ALL SELECT r.id,r.created_at AS date,'referral' AS kind FROM referrals r
    WHERE r.affiliate_id=${affiliateId} ${q.month ? Prisma.sql`AND r.month_key=${q.month}` : Prisma.empty}
      AND NOT EXISTS (SELECT 1 FROM commissions c WHERE c.affiliate_id=${affiliateId}
        AND c.referred_user_id=r.referred_user_id)`;
}
export function referralRowsPage(affiliateId: string, q: AffiliatePageQuery) {
  return Prisma.sql`SELECT p.id,p.date,COALESCE(c.referred_user_id,r.referred_user_id) AS "customerId",
    COALESCE(c.list_amount,0) AS "feeAmount",COALESCE(c.amount,0) AS commission,
    COALESCE(c.rate,0) AS rate,COALESCE(c.status::text,r.status::text) AS status,
    c.cancel_reason AS "cancelReason",c.plan::text AS plan,
    COALESCE(c.customer_year,1) AS "customerYear",COALESCE(c.source::text,'membership') AS source
    FROM (SELECT id,date,kind FROM (${referralIds(affiliateId, q)}) candidates
      ORDER BY date DESC,id DESC LIMIT ${q.size} OFFSET ${(q.page - 1) * q.size}) p
    LEFT JOIN commissions c ON p.kind='commission' AND c.id=p.id
    LEFT JOIN referrals r ON p.kind='referral' AND r.id=p.id
    ORDER BY p.date DESC,p.id DESC`;
}
export function referralRowsSummary(affiliateId: string, q: AffiliatePageQuery) {
  return Prisma.sql`SELECT count(*)::int AS count,
    COALESCE(sum(c.amount) FILTER (WHERE c.status<>'cancelled'),0)::bigint AS commission,
    count(*) FILTER (WHERE c.status='recorded')::int AS recorded,
    count(*) FILTER (WHERE c.status='paid')::int AS paid
    FROM (${referralIds(affiliateId, q)}) p LEFT JOIN commissions c ON p.kind='commission' AND c.id=p.id`;
}
