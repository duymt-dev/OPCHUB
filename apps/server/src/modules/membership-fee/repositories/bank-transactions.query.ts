import { Prisma } from '@opchub/db';
import type { BankTxnQuery } from '@opchub/shared/api-domains';

export function bankTransactionsQuery(cursor: BankTxnQuery['cursor'], limit: number) {
  const seek = cursor
    ? Prisma.sql`AND (received_at,id)<(${new Date(cursor.receivedAt)},${cursor.id})`
    : Prisma.empty;
  return Prisma.sql`
    SELECT p.id,p.amount,p.content,p.received_at,p.match_status,p.short_note,
      p.raw->>'_unmatchedReason' AS reason,p.raw->>'_unmatchedCode' AS reason_code,
      u.full_name AS member_name,h.full_name AS suggested_name,h.member_code AS suggested_code
    FROM (
      SELECT id,received_at FROM payment_transactions WHERE match_status<>'ignored'
      ${seek} ORDER BY received_at DESC,id DESC LIMIT ${limit}
    ) ids
    JOIN payment_transactions p ON p.id=ids.id
    LEFT JOIN users u ON u.id=p.matched_user_id
    LEFT JOIN LATERAL (
      SELECT full_name,member_code FROM users
      WHERE deleted_at IS NULL AND (
        member_code=substring(upper(p.content) from 'TV[0-9]{6}')
        OR phone='+84'||substring(substring(p.content from '0[0-9]{9}') from 2))
      ORDER BY (member_code=substring(upper(p.content) from 'TV[0-9]{6}')) DESC NULLS LAST
      LIMIT 1
    ) h ON true
    ORDER BY p.received_at DESC,p.id DESC`;
}
export const bankCountsQuery = Prisma.sql`
  SELECT (SELECT count(*) FROM payment_transactions WHERE match_status='matched') AS matched,
    (SELECT count(*) FROM payment_transactions WHERE match_status='unmatched') AS pending`;
