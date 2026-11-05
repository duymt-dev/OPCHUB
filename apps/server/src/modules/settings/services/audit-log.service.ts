import { Inject, Injectable } from '@nestjs/common';
import {
  AUDIT_TAGS,
  encodeAuditLogCursor,
  type AuditLogRow,
  type AuditTag,
  type AuditLogPageQuery,
} from '@opchub/shared/api-domains';
import { ADMIN_DIRECTORY_PORT, type AdminDirectoryPort } from '@/common/auth';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditLogRepository } from '../repositories/audit-log.repository';
const isTag = (t: string): t is AuditTag => (AUDIT_TAGS as readonly string[]).includes(t);

/**
 * Nhật ký hoạt động Admin (`s.log`) — idx audit_logs (created_at DESC, id DESC); tên/ảnh người
 * thao tác lấy 1 query cho cả lô (audit_logs không FK để giữ bản ghi khi user bị xoá).
 */
@Injectable()
export class AuditLogService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ADMIN_DIRECTORY_PORT) private readonly admins: AdminDirectoryPort,
    private readonly repo: AuditLogRepository,
  ) {}

  async page(query: AuditLogPageQuery, now = new Date()) {
    const stored = await this.repo.page(now, query.limit + 1, query.cursor);
    const rows = stored.slice(0, query.limit);
    const last = rows.at(-1);
    const ids = [...new Set(rows.flatMap((r) => (r.actorId ? [r.actorId] : [])))];
    // D-52: người thao tác là TK quản trị (`admin_users`, tên hiện hành) hoặc thành viên (`users`)
    const [admins, actors] = ids.length
      ? await Promise.all([
          this.admins.namesOf(ids),
          this.prisma.db.user.findMany({
            where: { id: { in: ids } },
            select: { id: true, fullName: true, avatarUrl: true },
          }),
        ])
      : [new Map<string, string>(), []];
    const at = new Map(actors.map((a) => [a.id, a]));
    return {
      nextCursor:
        stored.length > query.limit && last
          ? encodeAuditLogCursor({ at: last.cursorAt, id: last.id })
          : null,
      items: rows.map((r): AuditLogRow => {
        const a = r.actorId ? at.get(r.actorId) : undefined;
        return {
          id: r.id,
          actorName: (r.actorId ? admins.get(r.actorId) : undefined) ?? a?.fullName ?? 'Hệ thống',
          actorAvatarUrl: a?.avatarUrl ?? null,
          summary: r.summary,
          tag: isTag(r.tag) ? r.tag : 'settings',
          at: r.createdAt.toISOString(),
        };
      }),
    };
  }
}
