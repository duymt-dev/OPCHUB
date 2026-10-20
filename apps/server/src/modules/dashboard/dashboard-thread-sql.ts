import { Prisma } from '@opchub/db';

export interface ThreadCursor {
  at: Date;
  id: string;
}

/** Narrow indexed IDs first; UNION deduplicates a reply that also belongs to the execution. */
const responses = Prisma.sql`
  SELECT x.id, x.created_at FROM messages x
  WHERE x.room_id = m.room_id AND x.bot_thread_id = m.bot_thread_id AND x.bot_thread_id IS NOT NULL
    AND x.id <> m.id AND x.hidden_at IS NULL AND x.deleted_at IS NULL
  UNION
  SELECT x.id, x.created_at FROM messages x
  WHERE x.reply_to_id = m.id AND x.reply_to_id IS NOT NULL AND x.hidden_at IS NULL AND x.deleted_at IS NULL`;

/** One actual query, including response counts/preview. Never LIMIT wide message bodies. */
export function dashboardThreadsSql(before?: ThreadCursor) {
  const cursor = before
    ? Prisma.sql`AND (candidate.created_at, candidate.id) < (${before.at}, ${before.id})`
    : Prisma.empty;
  return Prisma.sql`
    WITH picked AS MATERIALIZED (
      SELECT candidate.id, candidate.room_id, candidate.bot_thread_id, candidate.created_at
      FROM messages candidate
      JOIN rooms r ON r.id = candidate.room_id AND r.is_default
      JOIN groups g ON g.id = r.group_id AND g.deleted_at IS NULL
      WHERE candidate.is_simulated AND candidate.bot_opening
        AND candidate.hidden_at IS NULL AND candidate.deleted_at IS NULL ${cursor}
      ORDER BY candidate.created_at DESC, candidate.id DESC LIMIT 50
    )
    SELECT m.id, coalesce(p.name, 'Thành viên') AS sender, p.avatar_url,
      g.id AS group_id, g.name AS group_name, m.body, m.created_at,
      coalesce(p.title, '') AS role, coalesce(p.color, '#1677FF') AS color,
      rp.sender AS reply_name, rp.body AS reply_body, rc.n::int AS reply_count
    FROM picked selected JOIN messages m ON m.id = selected.id
    JOIN rooms r ON r.id = selected.room_id JOIN groups g ON g.id = r.group_id
    LEFT JOIN personas p ON p.id = m.persona_id
    LEFT JOIN LATERAL (SELECT count(*) AS n FROM (${responses}) refs) rc ON true
    LEFT JOIN LATERAL (
      SELECT coalesce(u.full_name, persona.name, 'Thành viên') AS sender, x.body
      FROM (SELECT refs.id FROM (${responses}) refs ORDER BY refs.created_at, refs.id LIMIT 1) first
      JOIN messages x ON x.id = first.id
      LEFT JOIN users u ON u.id = x.sender_id LEFT JOIN personas persona ON persona.id = x.persona_id
    ) rp ON true
    ORDER BY selected.created_at DESC, selected.id DESC`;
}
