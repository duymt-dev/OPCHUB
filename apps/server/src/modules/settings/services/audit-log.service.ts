import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_TAGS, type AuditLogRow, type AuditTag } from '@opchub/shared/api-domains';
import { ADMIN_DIRECTORY_PORT, type AdminDirectoryPort } from '@/common/auth';
import { PrismaService } from '@/common/prisma/prisma.service';

const WINDOW_MS = 90 * 86_400_000;
/** Màn "Nhật ký" tải một lần (không phân trang) — trần số dòng */
const LIMIT = 500;
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
  ) {}

  async recent(now = new Date()): Promise<{ items: AuditLogRow[] }> {
    const rows = await this.prisma.db.auditLog.findMany({
      where: { createdAt: { gte: new Date(now.getTime() - WINDOW_MS) } },
      select: { id: true, actorId: true, summary: true, tag: true, createdAt: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: LIMIT,
    });
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
      items: rows.map((r) => {
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
