import { Injectable } from '@nestjs/common';
import { Prisma } from '@opchub/db';
import { containsPattern } from '@/common/prisma/like';
import { PrismaService } from '@/common/prisma/prisma.service';
import { memberSearchQuery } from './member-search.query';

export const memberGlobalSearchQuery = (q: string) => Prisma.sql`
  SELECT u.id,u.full_name AS title,u.email::text AS sub,u.status
  FROM (SELECT u.id FROM users u WHERE u.deleted_at IS NULL
    AND u.account_type IN ('personal','business') AND
    (u.id IN (${memberSearchQuery(q)})
      ${/^TV\d{6}$/i.test(q) ? Prisma.sql`OR u.member_code=${q.toUpperCase()}` : Prisma.empty})
    ORDER BY (immutable_unaccent(u.full_name) ILIKE immutable_unaccent(${containsPattern(q).slice(1)})) DESC,
      u.member_code,u.id LIMIT 4) found JOIN users u ON u.id=found.id
  ORDER BY (immutable_unaccent(u.full_name) ILIKE immutable_unaccent(${containsPattern(q).slice(1)})) DESC,
    u.member_code,u.id`;

@Injectable()
export class MemberSearchRepository {
  constructor(private readonly prisma: PrismaService) {}
  search(q: string) {
    return this.prisma.db.$queryRaw<{ id: string; title: string; sub: string; status: string }[]>(
      memberGlobalSearchQuery(q),
    );
  }
}
