import { Prisma } from '@opchub/db';
import type { DirectorMemberQuery } from '@opchub/shared/api-domains';
import { containsPattern } from '@/common/prisma/like';

export const directorMemberQueries = (
  query: DirectorMemberQuery,
  excludedIds: readonly string[],
) => {
  const search = query.q
    ? Prisma.sql`AND immutable_unaccent(u.full_name || ' ' || u.email::text || ' ' || u.member_code)
        ILIKE immutable_unaccent(${containsPattern(query.q)})`
    : Prisma.empty;
  const eligible = Prisma.sql`u.deleted_at IS NULL AND u.status = 'active'
    AND u.id <> ALL(${[...excludedIds]}::text[]) ${search}`;
  // The compact status index counts eligible rows without carrying wide identities.
  // Subtract at most the current incumbents by indexed ID, in the same MVCC snapshot.
  const count = query.q
    ? Prisma.sql`SELECT count(*)::int AS total FROM users u WHERE ${eligible}`
    : Prisma.sql`SELECT (
        (SELECT count(*) FROM users WHERE deleted_at IS NULL AND status = 'active') -
        (SELECT count(*) FROM users WHERE deleted_at IS NULL AND status = 'active'
          AND id = ANY(${[...excludedIds]}::text[]))
      )::int AS total`;
  return {
    page: Prisma.sql`SELECT p.id, u.member_code AS "memberCode", u.full_name AS "fullName", u.email::text AS email
      FROM (SELECT u.id, u.created_at FROM users u WHERE ${eligible}
        ORDER BY u.created_at DESC, u.id DESC LIMIT ${query.size} OFFSET ${(query.page - 1) * query.size}) p
      JOIN users u ON u.id = p.id ORDER BY p.created_at DESC, p.id DESC`,
    count,
  };
};
