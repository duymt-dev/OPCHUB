import { Prisma } from '@opchub/db';

export interface RotationCandidate {
  groupId: string;
  scriptId: string;
}

/** Seek each free group's membership pool, rank IDs after its cursor before wrapping.
 * No JSON lines/topic payload until the service has reserved at most 30 slots.
 * The two-part ordering avoids a LIMIT/ordered-PK plan that filters every script
 * for each group with no assignment. GIN finds that group's candidates first.
 */
export function botRotationCandidatesSql(now: Date) {
  return Prisma.sql`
    SELECT g.id AS "groupId", candidate.id AS "scriptId"
    FROM groups g
    LEFT JOIN bot_rotation_cursors c ON c.group_id = g.id
    JOIN LATERAL (
      SELECT s.id FROM bot_scripts s
      WHERE s.enabled AND s.group_ids @> ARRAY[g.id]::text[]
        AND (s.run_at IS NULL OR s.run_at <= ${now})
      ORDER BY (s.id > COALESCE(c.last_script_id, '')) DESC, s.id LIMIT 1
    ) candidate ON true
    WHERE g.deleted_at IS NULL
      AND EXISTS (SELECT 1 FROM rooms r WHERE r.group_id = g.id AND r.is_default AND r.deleted_at IS NULL)
      AND NOT EXISTS (
        SELECT 1 FROM bot_threads t
        WHERE t.status IN ('scheduled', 'running') AND t.group_ids @> ARRAY[g.id]::text[]
      )
    ORDER BY c.updated_at ASC NULLS FIRST, g.id
    LIMIT 30`;
}
