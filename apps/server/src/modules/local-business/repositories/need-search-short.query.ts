import { Prisma } from '@opchub/db';
import { containsPattern } from '@/common/prisma/like';
import { visibleNeedSql } from './search-visibility.query';

/**
 * Two-character patterns can have no selective trigram. Filter ranked prefixes
 * first using the SAME needs_search expression, before the visibility joins.
 * Only search the fallback when fewer than four eligible prefixes exist.
 * Excluding their <=3 IDs avoids unaccent(title) on every fallback match. Both branches
 * apply identical visibility BEFORE limiting; this is not a pre-visibility limit.
 */
export function shortNeedSearchQuery(q: string, admin: boolean, now: Date): Prisma.Sql {
  const visible = admin ? Prisma.sql`TRUE` : visibleNeedSql(now);
  const prefix = containsPattern(q).slice(1);
  return Prisma.sql`
    WITH prefix_hits AS MATERIALIZED (
      SELECT n.id,n.updated_at FROM needs n WHERE ${visible}
      AND immutable_unaccent(n.title || ' ' || n.field || ' ' || n.province)
        ILIKE immutable_unaccent(${prefix})
      AND immutable_unaccent(n.title) ILIKE immutable_unaccent(${prefix})
      ORDER BY n.updated_at DESC,n.id LIMIT 4
    ), fallback_hits AS (
      SELECT n.id,n.updated_at FROM needs n WHERE ${visible}
      AND immutable_unaccent(n.title || ' ' || n.field || ' ' || n.province)
        ILIKE immutable_unaccent(${containsPattern(q)})
      AND n.id NOT IN (SELECT id FROM prefix_hits)
      ORDER BY n.updated_at DESC,n.id
      LIMIT (SELECT 4-count(*) FROM prefix_hits)
    )
    SELECT n.id,n.title,n.field,n.province,n.status FROM (
      SELECT * FROM (
        SELECT id,updated_at,0 AS priority FROM prefix_hits
        UNION ALL SELECT id,updated_at,1 AS priority FROM fallback_hits
      ) ranked ORDER BY priority,updated_at DESC,id LIMIT 4
    ) found JOIN needs n ON n.id=found.id
    ORDER BY found.priority,found.updated_at DESC,found.id LIMIT 4`;
}
