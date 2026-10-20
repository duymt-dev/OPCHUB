import { Prisma } from '@opchub/db';
import type { AffiliatePageQuery } from '@opchub/shared/api-domains';

export const referralWhere = (affiliateId: string, q: AffiliatePageQuery) => Prisma.sql`
  r.affiliate_id=${affiliateId}
  ${q.month ? Prisma.sql`AND (c.month_key=${q.month} OR (c.id IS NULL AND r.month_key=${q.month}))` : Prisma.empty}`;

export const referralPageQuery = (affiliateId: string, q: AffiliatePageQuery) => Prisma.sql`
  SELECT r.id,r.referred_user_id AS "customerId",COALESCE(c.created_at,r.created_at) AS date,
    COALESCE(c.list_amount,600000) AS "feeAmount",COALESCE(c.amount,0) AS commission,
    COALESCE(c.rate,0) AS rate,COALESCE(c.status::text,r.status::text) AS status,
    c.cancel_reason AS "cancelReason"
  FROM (
    SELECT r.id FROM referrals r LEFT JOIN commissions c ON c.referred_user_id=r.referred_user_id
    WHERE ${referralWhere(affiliateId, q)} ORDER BY r.created_at DESC,r.id DESC
    LIMIT ${q.size} OFFSET ${(q.page - 1) * q.size}
  ) ids JOIN referrals r ON r.id=ids.id
  LEFT JOIN commissions c ON c.referred_user_id=r.referred_user_id
  ORDER BY r.created_at DESC,r.id DESC`;

export const payoutGroup = (affiliateId: string) => Prisma.sql`
  FROM commissions WHERE affiliate_id=${affiliateId} AND status='paid'
  GROUP BY month_key,paid_at,paid_bank_snapshot`;

export const payoutPageQuery = (affiliateId: string, q: AffiliatePageQuery) => Prisma.sql`
  SELECT month_key AS "monthKey",sum(amount)::bigint AS amount,count(*)::integer AS count,
    paid_at AS "paidAt",paid_bank_snapshot AS bank ${payoutGroup(affiliateId)}
  ORDER BY paid_at DESC,month_key DESC LIMIT ${q.size} OFFSET ${(q.page - 1) * q.size}`;
