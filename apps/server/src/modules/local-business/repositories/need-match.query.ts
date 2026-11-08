import { Injectable } from '@nestjs/common';
import { Prisma } from '@opchub/db';
import type { NeedMatchCandidate, NeedMatchStore } from '@opchub/shared';
import { PrismaService } from '@/common/prisma/prisma.service';
import { visibleNeedSql } from './search-visibility.query';

export interface MatchStoreRow extends NeedMatchStore {
  id: string;
  status: 'draft' | 'published' | 'hidden';
}

/** Unique owner seek; product names fetched through the store_id/sort index in one SQL. */
export const matchStoreQuery = (userId: string) => Prisma.sql`
  SELECT s.id,s.field,s.province,s.intro,s.status,
    ARRAY(SELECT i.name FROM store_items i WHERE i.store_id=s.id ORDER BY i.sort,i.id) AS "productNames"
  FROM stores s WHERE s.owner_id=${userId} LIMIT 1`;

/** D-139: reserve a separate 200-ID window for strong matches before fetching wide payloads. */
export const matchCandidatesQuery = (userId: string, store: MatchStoreRow, now: Date) => Prisma.sql`
  SELECT n.id,n.type,n.title,n.description,n.field,n.field_custom AS "fieldCustom",n.province,
    found.updated_at AS "updatedAt"
  FROM (
    SELECT DISTINCT id,updated_at FROM (
    (SELECT n.id,n.updated_at FROM needs n
    WHERE ${visibleNeedSql(now)} AND n.store_id<>${store.id} AND n.owner_id<>${userId}
      AND ${store.field}<>'' AND n.field=${store.field}
      AND ${store.province}<>'' AND n.province=${store.province}
    ORDER BY n.updated_at DESC,n.id LIMIT 200)
    UNION ALL
    (SELECT n.id,n.updated_at FROM needs n
    WHERE ${visibleNeedSql(now)} AND n.store_id<>${store.id} AND n.owner_id<>${userId}
      AND ((${store.field}<>'' AND n.field=${store.field})
        OR (${store.province}<>'' AND n.province=${store.province}))
    ORDER BY n.updated_at DESC,n.id LIMIT 200)
    ) candidates
  ) found CROSS JOIN LATERAL (
    SELECT n.id,n.type,n.title,n.description,n.field,n.field_custom,n.province
    FROM needs n WHERE n.id=found.id LIMIT 1
  ) n ORDER BY found.updated_at DESC,n.id`;

@Injectable()
export class NeedMatchRepository {
  constructor(private readonly prisma: PrismaService) {}
  async store(userId: string): Promise<MatchStoreRow | null> {
    return (await this.prisma.db.$queryRaw<MatchStoreRow[]>(matchStoreQuery(userId)))[0] ?? null;
  }
  candidates(userId: string, store: MatchStoreRow, now: Date) {
    return this.prisma.db.$queryRaw<NeedMatchCandidate[]>(matchCandidatesQuery(userId, store, now));
  }
}
