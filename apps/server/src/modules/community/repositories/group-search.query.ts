import { Injectable } from '@nestjs/common';
import { Prisma } from '@opchub/db';
import type { SearchHit } from '@opchub/shared/api-domains';
import { containsPattern } from '@/common/prisma/like';
import { PrismaService } from '@/common/prisma/prisma.service';

/** groups_search is immutable_unaccent(name), not province or a concatenated field. */
export const groupSearchQuery = (q: string, userId: string) => Prisma.sql`
  SELECT g.id,g.name AS title,'' AS sub,g.member_count AS "memberCount",
    EXISTS(SELECT 1 FROM group_members gm WHERE gm.group_id=g.id AND gm.user_id=${userId}
      AND gm.status='member') AS joined
  FROM (SELECT id FROM groups WHERE deleted_at IS NULL
    AND immutable_unaccent(name) ILIKE immutable_unaccent(${containsPattern(q)})
    ORDER BY (immutable_unaccent(name) ILIKE immutable_unaccent(${containsPattern(q).slice(1)})) DESC,
      member_count DESC,id LIMIT 4) found JOIN groups g ON g.id=found.id
  ORDER BY (immutable_unaccent(g.name) ILIKE immutable_unaccent(${containsPattern(q).slice(1)})) DESC,
    g.member_count DESC,g.id`;

@Injectable()
export class GroupSearchRepository {
  constructor(private readonly prisma: PrismaService) {}
  search(q: string, userId: string) {
    return this.prisma.db.$queryRaw<SearchHit[]>(groupSearchQuery(q, userId));
  }
}
