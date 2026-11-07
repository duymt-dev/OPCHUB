import { Prisma } from '@opchub/db';

/** Exact runtime fragment shared with the 10k-row EXPLAIN integration check. */
export function personaTurnPruneSql(roomIds: string[], at: Date) {
  // Seek the retained boundary (including the ID tie-breaker) before reading stale IDs.
  // One SQL statement handles all rooms; no query per room or planner setting.
  const selectors = [...new Set(roomIds)].map(
    (roomId) => Prisma.sql`(
    SELECT old.id FROM (
      SELECT created_at, id FROM messages
      WHERE room_id = ${roomId} AND is_simulated AND deleted_at IS NULL
      ORDER BY created_at DESC, id DESC OFFSET 119 LIMIT 1
    ) boundary
    CROSS JOIN LATERAL (
      SELECT id FROM messages
      WHERE room_id = ${roomId} AND is_simulated AND deleted_at IS NULL
        AND (created_at, id) < (boundary.created_at, boundary.id)
    ) old
  )`,
  );
  const ids = selectors.length
    ? Prisma.join(selectors, ' UNION ALL ')
    : Prisma.sql`SELECT NULL::text AS id WHERE false`;
  return Prisma.sql`
    UPDATE messages m SET deleted_at = ${at}, updated_at = ${at}
    WHERE m.id = ANY(ARRAY(SELECT stale.id FROM (${ids}) stale))`;
}
