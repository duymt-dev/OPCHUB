import { Injectable } from '@nestjs/common';
import { Prisma } from '@opchub/db';
import { containsPattern } from '@/common/prisma/like';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { StoreSearchRow } from './store-search.query';
import { visibleNeedSql } from './search-visibility.query';
import { shortNeedSearchQuery } from './need-search-short.query';

/** Expression must match needs_search exactly. Only four IDs reach the payload join. */
export const containsNeedSearchQuery = (q: string, admin: boolean, now: Date) => Prisma.sql`
  SELECT n.id,n.title,n.field,n.province,n.status FROM (
    SELECT n.id FROM needs n WHERE ${admin ? Prisma.sql`TRUE` : visibleNeedSql(now)}
    AND immutable_unaccent(n.title || ' ' || n.field || ' ' || n.province)
      ILIKE immutable_unaccent(${containsPattern(q)})
    ORDER BY (immutable_unaccent(n.title) ILIKE immutable_unaccent(${containsPattern(q).slice(1)})) DESC,
      n.updated_at DESC,n.id LIMIT 4
  ) found JOIN needs n ON n.id=found.id
  ORDER BY (immutable_unaccent(n.title) ILIKE immutable_unaccent(${containsPattern(q).slice(1)})) DESC,
    n.updated_at DESC,n.id`;

export const needSearchQuery = (q: string, admin: boolean, now: Date) =>
  q.length === 2 ? shortNeedSearchQuery(q, admin, now) : containsNeedSearchQuery(q, admin, now);
@Injectable()
export class NeedSearchRepository {
  constructor(private readonly prisma: PrismaService) {}
  search(q: string, admin: boolean, now: Date) {
    return this.prisma.db.$queryRaw<StoreSearchRow[]>(needSearchQuery(q, admin, now));
  }
}
