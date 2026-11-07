import { Prisma } from '@opchub/db';

/** Exact runtime fragment shared with the skewed EXPLAIN integration checks. */
export function personaTurnPruneSql(roomIds: string[], at: Date) {
  // Read stale IDs in bounded keyset pages within one statement. A hot room must
  // not turn an otherwise selective partial-index seek into a whole-table scan.
  const selectors = [...new Set(roomIds)].map(
    (roomId) => Prisma.sql`(
      WITH RECURSIVE batches(ids) AS (
        SELECT ARRAY(
          SELECT id FROM messages
          WHERE room_id = ${roomId} AND is_simulated AND deleted_at IS NULL
          ORDER BY created_at DESC, id DESC OFFSET 120 LIMIT 128
        )
        UNION ALL
        SELECT ARRAY(
          SELECT id FROM messages
          WHERE room_id = ${roomId} AND is_simulated AND deleted_at IS NULL
            AND (created_at, id) < (
              SELECT created_at, id FROM messages
              WHERE id = batches.ids[cardinality(batches.ids)]
            )
          ORDER BY created_at DESC, id DESC LIMIT 128
        )
        FROM batches WHERE cardinality(ids) = 128
      )
      SELECT unnest(ids) AS id FROM batches
    )`,
  );
  const ids = selectors.length
    ? Prisma.join(selectors, ' UNION ALL ')
    : Prisma.sql`SELECT NULL::text AS id WHERE false`;
  return Prisma.sql`
    UPDATE messages m SET deleted_at = ${at}, updated_at = ${at}
    WHERE m.id = ANY(ARRAY(SELECT stale.id FROM (${ids}) stale))`;
}
