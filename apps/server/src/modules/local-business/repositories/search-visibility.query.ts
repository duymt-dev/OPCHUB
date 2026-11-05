import { Prisma } from '@opchub/db';
import { usableFeeSql } from '@/common/auth';

/** TIP-808 approved narrow SQL counterpart; integration-tested against visibleStore. */
export function visibleStoreSql(now: Date): Prisma.Sql {
  return Prisma.sql`s.status='published' AND EXISTS (
    SELECT 1 FROM users owner JOIN membership_fees f ON f.user_id=owner.id
    WHERE owner.id=s.owner_id AND owner.deleted_at IS NULL AND ${usableFeeSql('f', now)})`;
}

/** The parent store alias is local to this subquery, not supplied by request data. */
export function visibleNeedSql(now: Date): Prisma.Sql {
  return Prisma.sql`n.status='open' AND EXISTS (
    SELECT 1 FROM stores s WHERE s.id=n.store_id AND ${visibleStoreSql(now)})`;
}
