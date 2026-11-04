import { Prisma } from '@opchub/db';
import type { AffiliatePageQuery } from '@opchub/shared/api-domains';

export { referralRowsPage as referralPageQuery } from './referral-rows.query';

export const payoutGroup = (affiliateId: string) => Prisma.sql`
  FROM commissions WHERE affiliate_id=${affiliateId} AND status='paid'
  GROUP BY month_key,paid_at,paid_bank_snapshot`;

export const payoutPageQuery = (affiliateId: string, q: AffiliatePageQuery) => Prisma.sql`
  SELECT month_key AS "monthKey",sum(amount)::bigint AS amount,count(*)::integer AS count,
    paid_at AS "paidAt",paid_bank_snapshot AS bank ${payoutGroup(affiliateId)}
  ORDER BY paid_at DESC,month_key DESC LIMIT ${q.size} OFFSET ${(q.page - 1) * q.size}`;
