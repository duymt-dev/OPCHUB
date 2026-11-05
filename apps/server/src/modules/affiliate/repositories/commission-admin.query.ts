import { Prisma } from '@opchub/db';
import type { AffiliateCommissionQuery } from '@opchub/shared/api-domains';
import { containsPattern } from '@/common/prisma/like';
import { commissionVisible } from './commission-visible.sql';

export interface CommissionPageOptions {
  ids?: readonly string[];
  after?: { date: Date; id: string };
}

/** Two bounded ID sets avoid scanning the global date index for an OR/subplan filter. */
function searchIds(q: string, memberIds: readonly string[]) {
  return Prisma.sql`
    SELECT id FROM commissions WHERE referred_user_id=ANY(${[...memberIds]}::text[])
    UNION
    SELECT scoped.id FROM affiliates owner JOIN commissions scoped ON scoped.affiliate_id=owner.id
    WHERE owner.user_id=ANY(${[...memberIds]}::text[]) OR owner.code ILIKE ${containsPattern(q)}`;
}

export function commissionWhere(
  q: AffiliateCommissionQuery,
  memberIds: readonly string[],
  options: CommissionPageOptions = {},
) {
  return Prisma.sql`WHERE ${commissionVisible}
    ${q.status !== 'all' ? Prisma.sql`AND c.status=${q.status}::commission_status` : Prisma.empty}
    ${q.month ? Prisma.sql`AND c.month_key=${q.month}` : Prisma.empty}
    ${options.ids ? Prisma.sql`AND c.id=ANY(${[...options.ids]}::text[])` : Prisma.empty}
    ${q.q ? Prisma.sql`AND c.id IN (${searchIds(q.q, memberIds)})` : Prisma.empty}`;
}

export function commissionPageQuery(
  q: AffiliateCommissionQuery,
  memberIds: readonly string[],
  options: CommissionPageOptions = {},
) {
  const where = commissionWhere(q, memberIds, options);
  return Prisma.sql`SELECT c.id,c.affiliate_id AS "affiliateId",c.referred_user_id AS "customerId",
    a.user_id AS "affiliateUserId",a.code,c.created_at AS date,c.list_amount AS "feeAmount",
    c.customer_year AS "customerYear",c.rate,c.amount,c.status::text AS status,c.cancel_reason AS "cancelReason",c.plan::text AS plan
    FROM (SELECT c.id FROM commissions c ${where}
      ${options.after ? Prisma.sql`AND (c.created_at,c.id)<(${options.after.date},${options.after.id})` : Prisma.empty}
      ORDER BY c.created_at DESC,c.id DESC LIMIT ${q.size} OFFSET ${options.after ? 0 : (q.page - 1) * q.size}
    ) ids JOIN commissions c ON c.id=ids.id JOIN affiliates a ON a.id=c.affiliate_id
    ORDER BY c.created_at DESC,c.id DESC`;
}
