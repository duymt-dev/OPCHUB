import { Prisma } from '@opchub/db';

/** D-121: one earliest current province membership per requested user. */
export const provinceMembershipQuery = (userIds: readonly string[]) => Prisma.sql`
  SELECT ids.user_id AS "userId", chosen.province
  FROM (SELECT DISTINCT unnest(${[...userIds]}::text[]) AS user_id) ids
  JOIN LATERAL (
    SELECT g.province FROM group_members m JOIN groups g ON g.id = m.group_id
    WHERE m.user_id = ids.user_id AND m.status = 'member'
      AND g.kind = 'province' AND g.deleted_at IS NULL
    ORDER BY m.created_at, m.group_id LIMIT 1
  ) chosen ON true
  ORDER BY ids.user_id`;
