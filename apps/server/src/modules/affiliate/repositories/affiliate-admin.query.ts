import { Prisma } from '@opchub/db';
import type { AffiliatePageQuery } from '@opchub/shared/api-domains';
import { containsPattern } from '@/common/prisma/like';

export function affiliateWhere(
  q: AffiliatePageQuery,
  memberIds: readonly string[],
  ids?: readonly string[],
) {
  return Prisma.sql`WHERE true
    ${ids ? Prisma.sql`AND a.id=ANY(${[...ids]}::text[])` : Prisma.empty}
    ${q.q ? Prisma.sql`AND (a.user_id=ANY(${[...memberIds]}::text[]) OR a.code ILIKE ${containsPattern(q.q)})` : Prisma.empty}`;
}

export function affiliatePageQuery(
  q: AffiliatePageQuery,
  memberIds: readonly string[],
  ids?: readonly string[],
  after?: { date: Date; id: string },
) {
  return Prisma.sql`SELECT a.id,a.user_id AS "userId",a.code,a.rate,a.status::text AS status,
    a.created_at AS date,(a.bank_name IS NOT NULL AND a.bank_no IS NOT NULL AND a.bank_holder IS NOT NULL) AS "hasBank",
    a.bank_name AS "bankName",a.bank_no AS "bankNo",a.bank_holder AS "bankHolder"
    FROM (SELECT a.id FROM affiliates a ${affiliateWhere(q, memberIds, ids)}
      ${after ? Prisma.sql`AND (a.created_at,a.id)<(${after.date},${after.id})` : Prisma.empty}
      ORDER BY a.created_at DESC,a.id DESC LIMIT ${q.size} OFFSET ${after ? 0 : (q.page - 1) * q.size}
    ) ids JOIN affiliates a ON a.id=ids.id ORDER BY a.created_at DESC,a.id DESC`;
}
