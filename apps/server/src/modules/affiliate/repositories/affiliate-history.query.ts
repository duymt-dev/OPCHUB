import { Prisma } from '@opchub/db';
import type { AffiliatePageQuery } from '@opchub/shared/api-domains';
import { commissionVisible } from './commission-visible.sql';

export const affiliateMonthsQuery = (id: string, q: AffiliatePageQuery) => Prisma.sql`
  SELECT month_key AS "monthKey",count(*) FILTER (WHERE status<>'cancelled')::integer AS customers,
    COALESCE(sum(amount) FILTER (WHERE status<>'cancelled'),0)::bigint AS amount,
    COALESCE(sum(amount) FILTER (WHERE status='recorded'),0)::bigint AS payable,max(paid_at) AS "paidAt",
    CASE WHEN count(DISTINCT status)>1 THEN 'mixed' ELSE min(status::text) END AS status
  FROM commissions c WHERE ${commissionVisible} AND affiliate_id=${id} GROUP BY month_key ORDER BY month_key DESC
  LIMIT ${q.size} OFFSET ${(q.page - 1) * q.size}`;

export const affiliateCustomersQuery = (id: string, q: AffiliatePageQuery) => Prisma.sql`
  SELECT c.id,c.referred_user_id AS "customerId",c.created_at AS date,c.list_amount AS "feeAmount",
    c.amount AS commission,c.rate,c.status::text AS status,c.cancel_reason AS "cancelReason",
    c.paid_at AS "paidAt",c.paid_bank_snapshot AS bank,c.plan::text AS plan
  FROM (SELECT id FROM commissions c WHERE ${commissionVisible} AND affiliate_id=${id} ORDER BY created_at DESC,id DESC
    LIMIT ${q.size} OFFSET ${(q.page - 1) * q.size}) ids JOIN commissions c ON c.id=ids.id
  ORDER BY c.created_at DESC,c.id DESC`;
