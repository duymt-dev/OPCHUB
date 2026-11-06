import { Injectable } from '@nestjs/common';
import { Prisma } from '@opchub/db';
import { containsPattern } from '@/common/prisma/like';
import { PrismaService } from '@/common/prisma/prisma.service';
import { visible } from './project-feed.query';

export const projectSearchQuery = (
  q: string,
  userId: string,
  admin: boolean,
  now: Date,
) => Prisma.sql`
  SELECT p.id,p.name AS title,COALESCE(NULLIF(p.summary,''),c.name,'') AS sub,p.status
  FROM (SELECT p.id FROM projects p WHERE
    ${admin ? Prisma.sql`p.deleted_at IS NULL` : visible(userId, now)}
    AND immutable_unaccent(p.name || ' ' || p.summary) ILIKE immutable_unaccent(${containsPattern(q)})
    ORDER BY (immutable_unaccent(p.name) ILIKE immutable_unaccent(${containsPattern(q).slice(1)})) DESC,
      p.published_at DESC,p.id LIMIT 4) found
  JOIN projects p ON p.id=found.id LEFT JOIN categories c ON c.id=p.category_id
  ORDER BY (immutable_unaccent(p.name) ILIKE immutable_unaccent(${containsPattern(q).slice(1)})) DESC,
    p.published_at DESC,p.id`;

export interface ProjectSearchRow {
  id: string;
  title: string;
  sub: string;
  status: string;
}
@Injectable()
export class ProjectSearchRepository {
  constructor(private readonly prisma: PrismaService) {}
  search(q: string, userId: string, admin: boolean, now: Date) {
    return this.prisma.db.$queryRaw<ProjectSearchRow[]>(projectSearchQuery(q, userId, admin, now));
  }
}
