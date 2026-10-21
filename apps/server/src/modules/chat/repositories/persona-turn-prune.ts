import { Prisma } from '@opchub/db';

/** Exact runtime fragment shared with the 10k-row EXPLAIN integration check. */
export function personaTurnPruneSql(roomIds: string[], at: Date) {
  // Bind each room directly: a correlated unnest loses skew statistics and overestimates
  // stale rows, causing a full-table hash update instead of the two actual PK lookups.
  // This builds ONE statement, not a database query per room.
  const selectors = [...new Set(roomIds)].map(
    (roomId) => Prisma.sql`(
    SELECT id FROM messages WHERE room_id = ${roomId} AND is_simulated AND deleted_at IS NULL
    ORDER BY created_at DESC, id DESC OFFSET 120
  )`,
  );
  const ids = selectors.length
    ? Prisma.join(selectors, ' UNION ALL ')
    : Prisma.sql`SELECT NULL::text AS id WHERE false`;
  return Prisma.sql`
    UPDATE messages m SET deleted_at = ${at}, updated_at = ${at}
    FROM (${ids}) stale WHERE m.id = stale.id`;
}
