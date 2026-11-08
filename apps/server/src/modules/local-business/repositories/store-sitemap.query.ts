import { Prisma } from '@opchub/db';
import { visibleStoreSql } from './search-visibility.query';

export interface StoreSitemapRow {
  id: string;
  slug: string;
  updatedAt: Date;
  at: string;
}
export const publicOwnerActiveSql = Prisma.sql`EXISTS (
  SELECT 1 FROM users public_owner WHERE public_owner.id=s.owner_id AND public_owner.status='active')`;

/** Covering ID window; no wide store payload is loaded before LIMIT. */
export const storeSitemapQuery = (now: Date, cursor?: { at: string; id: string }) => Prisma.sql`
  SELECT s.id,s.slug,s.updated_at AS "updatedAt",
    to_char(s.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS at
  FROM stores s WHERE ${visibleStoreSql(now)} AND ${publicOwnerActiveSql} AND s.seo_index AND s.slug IS NOT NULL
    ${cursor ? Prisma.sql`AND (s.updated_at,s.id) < (${cursor.at}::timestamptz,${cursor.id})` : Prisma.empty}
  ORDER BY s.updated_at DESC,s.id DESC LIMIT 1001`;

export const storeOwnerSlugsQuery = (ids: readonly string[]) => Prisma.sql`
  SELECT slug FROM stores WHERE owner_id = ANY(${[...ids]}::text[]) AND slug IS NOT NULL`;
