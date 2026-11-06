import { Injectable } from '@nestjs/common';
import { Prisma } from '@opchub/db';
import { containsPattern } from '@/common/prisma/like';
import { PrismaService } from '@/common/prisma/prisma.service';
import { visibleStoreSql } from './search-visibility.query';

/** Expression must match stores_search exactly, including concatenation inside unaccent. */
export const storeSearchQuery = (q: string, admin: boolean, now: Date) => Prisma.sql`
  SELECT s.id,s.name AS title,s.field,s.province,s.status FROM (
    SELECT s.id FROM stores s WHERE ${admin ? Prisma.sql`TRUE` : visibleStoreSql(now)}
    AND immutable_unaccent(s.name || ' ' || s.field || ' ' || s.province)
      ILIKE immutable_unaccent(${containsPattern(q)})
    ORDER BY (immutable_unaccent(s.name) ILIKE immutable_unaccent(${containsPattern(q).slice(1)})) DESC,
      s.updated_at DESC,s.id LIMIT 4
  ) found JOIN stores s ON s.id=found.id
  ORDER BY (immutable_unaccent(s.name) ILIKE immutable_unaccent(${containsPattern(q).slice(1)})) DESC,
    s.updated_at DESC,s.id`;
export interface StoreSearchRow {
  id: string;
  title: string;
  field: string;
  province: string;
  status: string;
}
@Injectable()
export class StoreSearchRepository {
  constructor(private readonly prisma: PrismaService) {}
  search(q: string, admin: boolean, now: Date) {
    return this.prisma.db.$queryRaw<StoreSearchRow[]>(storeSearchQuery(q, admin, now));
  }
}
