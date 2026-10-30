import { Prisma } from '@opchub/db';
import type { DirectorHistoryQuery } from '@opchub/shared/api-domains';

export function directorHistoryQuery(query: DirectorHistoryQuery) {
  const clauses = [Prisma.sql`true`];
  if (query.region) clauses.push(Prisma.sql`region = ${query.region}::region`);
  if (query.beforeAt && query.beforeId)
    clauses.push(Prisma.sql`(created_at, id) < (${new Date(query.beforeAt)}, ${query.beforeId})`);
  return Prisma.sql`SELECT id, region, action, member_name AS "memberName", actor_name AS "actorName",
    actor_role AS "actorRole", created_at AS at, summary
    FROM regional_director_history WHERE ${Prisma.join(clauses, ' AND ')}
    ORDER BY created_at DESC, id DESC LIMIT ${query.size + 1}`;
}
