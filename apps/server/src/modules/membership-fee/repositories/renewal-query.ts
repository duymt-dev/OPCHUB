import { Prisma } from '@opchub/db';
import type { RenewalQuery } from '@opchub/shared/api-domains';
type RenewalCursor = NonNullable<RenewalQuery['cursor']>;
export const renewalEligible = (from: Date, to: Date) => Prisma.sql`
  f.status IN ('trial','active','expiring') AND f.plan IN ('personal','business')
  AND f.valid_until >= ${from} AND f.valid_until < ${to}
  AND (SELECT true FROM users u WHERE u.id=f.user_id AND u.status='active'
    AND u.deleted_at IS NULL AND u.account_type <> 'investor' LIMIT 1)`;

/** Export the exact runtime query so EXPLAIN tests never measure a simplified substitute. */
export function renewalRowsQuery(
  from: Date,
  to: Date,
  cursor: RenewalCursor | undefined,
  limit: number,
  userIds?: string[],
) {
  const seek = cursor
    ? Prisma.sql`AND (f.valid_until,f.user_id) > (${new Date(cursor.validUntil)},${cursor.userId})`
    : Prisma.empty;
  const ids = userIds ? Prisma.sql`AND f.user_id = ANY(${userIds}::text[])` : Prisma.empty;
  return Prisma.sql`
    SELECT f.user_id,u.full_name,u.email::text AS email,u.member_code,u.phone,
      f.valid_until,f.amount,f.plan,(f.paid_at IS NULL) AS trial,
      (SELECT r.sent_at FROM fee_reminders r WHERE r.user_id=f.user_id ORDER BY r.sent_at DESC LIMIT 1) AS last_sent_at,
      ARRAY(SELECT r.milestone FROM fee_reminders r WHERE r.user_id=f.user_id AND r.valid_until=f.valid_until) AS sent
    FROM (SELECT f.user_id FROM membership_fees f WHERE ${renewalEligible(from, to)} ${seek} ${ids}
      ORDER BY f.valid_until,f.user_id LIMIT ${limit}) picked
    -- Bounded late payload lookups: do not hash/scan the full wide tables for a 500-ID batch.
    JOIN LATERAL (SELECT user_id,valid_until,amount,plan,paid_at FROM membership_fees
      WHERE user_id=picked.user_id LIMIT 1) f ON true
    JOIN LATERAL (SELECT id,full_name,email,member_code,phone FROM users
      WHERE id=f.user_id LIMIT 1) u ON true
    ORDER BY f.valid_until,f.user_id`;
}
