import { Prisma } from '@opchub/db';
import { exemptFeeStatuses, expirableFeeStatuses } from '@opchub/shared';

/** V-11: same policy as isFeeUsable, expressed for DB discovery queries. */
export const usableFeeWhere = (now: Date): Prisma.MembershipFeeWhereInput => ({
  OR: [
    { status: { in: exemptFeeStatuses() } },
    { status: { in: expirableFeeStatuses() }, validUntil: { gt: now } },
  ],
});

/** Callers pass trusted SQL column expressions, never a raw identifier from input. */
export const usableFeeSql = (status: Prisma.Sql, validUntil: Prisma.Sql, now: Date | Prisma.Sql) =>
  Prisma.sql`(${status} = ANY(${exemptFeeStatuses()}::membership_fee_status[])
    OR (${status} = ANY(${expirableFeeStatuses()}::membership_fee_status[]) AND ${validUntil} > ${now}))`;
