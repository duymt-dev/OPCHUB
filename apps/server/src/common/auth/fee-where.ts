import { Prisma } from '@opchub/db';
import { OPEN_ENDED_FEE_STATUS, usableFeeStatuses } from '@opchub/shared';

const openEnded = [...OPEN_ENDED_FEE_STATUS];
const dated = usableFeeStatuses().filter((s) => !openEnded.some((v) => v === s));

/** V-11 / V-16: shared fee predicate for Prisma listings. */
export function usableFeeWhere(now: Date): Prisma.MembershipFeeWhereInput {
  return {
    OR: [{ status: { in: dated }, validUntil: { gt: now } }, { status: { in: openEnded } }],
  };
}

/** Alias is a validated internal SQL identifier, never request data. */
export function usableFeeSql(alias: string, now: Date | Prisma.Sql): Prisma.Sql {
  if (!/^[a-z][a-z0-9_]*$/i.test(alias)) throw new Error('Invalid fee table alias');
  const status = Prisma.raw(`"${alias}".status`);
  const until = Prisma.raw(`"${alias}".valid_until`);
  return Prisma.sql`((${status} = ANY(${dated}::membership_fee_status[]) AND ${until} > ${now})
    OR ${status} = ANY(${openEnded}::membership_fee_status[]))`;
}
