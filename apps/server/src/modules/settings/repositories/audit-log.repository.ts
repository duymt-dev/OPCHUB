import { Injectable } from '@nestjs/common';
import { Prisma } from '@opchub/db';
import type { AuditLogCursor } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';

export const AUDIT_WINDOW_MS = 90 * 86_400_000;
export interface AuditStoredRow {
  id: string;
  actorId: string | null;
  summary: string;
  tag: string;
  createdAt: Date;
  cursorAt: string;
}
export const auditLogPageQuery = (now: Date, limit: number, cursor?: AuditLogCursor) => Prisma.sql`
  SELECT a.id,a.actor_id AS "actorId",a.summary,a.tag,a.created_at AS "createdAt",
    to_char(a.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "cursorAt"
  FROM (SELECT id,created_at FROM audit_logs
    WHERE created_at>=${new Date(now.getTime() - AUDIT_WINDOW_MS)} AND created_at<=${now}
    ${cursor ? Prisma.sql`AND (created_at,id)<(${cursor.at}::timestamptz,${cursor.id})` : Prisma.empty}
    ORDER BY created_at DESC,id DESC LIMIT ${limit}) page
  JOIN LATERAL (SELECT id,actor_id,summary,tag,created_at FROM audit_logs
    WHERE id=page.id OFFSET 0) a ON true
  ORDER BY page.created_at DESC,page.id DESC`;

@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}
  page(now: Date, limit: number, cursor?: AuditLogCursor) {
    return this.prisma.db.$queryRaw<AuditStoredRow[]>(auditLogPageQuery(now, limit, cursor));
  }
}
