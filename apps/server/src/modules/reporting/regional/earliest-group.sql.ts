import { Prisma } from '@opchub/db';
/** D-128: one definition shared by aggregate counts and receipt-time attribution. */
export const earliestRegionalGroup = (user: Prisma.Sql) => Prisma.sql`
  SELECT COALESCE(parent.region, g.region) AS region, COALESCE(parent.province,g.province) AS province_name
  FROM group_members gm JOIN groups g ON g.id = gm.group_id
  LEFT JOIN groups parent ON parent.id = g.parent_id AND parent.deleted_at IS NULL
  WHERE gm.user_id = ${user} AND gm.status = 'member' AND g.deleted_at IS NULL
    AND (g.kind = 'province' OR parent.kind = 'province')
  ORDER BY gm.created_at, gm.group_id LIMIT 1`;
