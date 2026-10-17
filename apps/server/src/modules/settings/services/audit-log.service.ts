import { Injectable } from '@nestjs/common';
import { AUDIT_TAGS, type AuditLogRow, type AuditTag } from '@opchub/shared/api-domains';
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
  constructor(private readonly prisma: PrismaService) {}

  async recent(now = new Date()): Promise<{ items: AuditLogRow[] }> {
    const rows = await this.prisma.db.auditLog.findMany({
      where: { createdAt: { gte: new Date(now.getTime() - WINDOW_MS) } },
      select: { id: true, actorId: true, summary: true, tag: true, createdAt: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: LIMIT,
    });
    const ids = [...new Set(rows.flatMap((r) => (r.actorId ? [r.actorId] : [])))];
    const actors = ids.length
      ? await this.prisma.db.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, fullName: true, avatarUrl: true },
        })
      : [];
    const at = new Map(actors.map((a) => [a.id, a]));
    return {
      items: rows.map((r) => {
        const a = r.actorId ? at.get(r.actorId) : undefined;
        return {
          id: r.id,
          actorName: a?.fullName ?? 'Hệ thống',
          actorAvatarUrl: a?.avatarUrl ?? null,
          summary: r.summary,
          tag: isTag(r.tag) ? r.tag : 'settings',
          at: r.createdAt.toISOString(),
        };
      }),
    };
  }
}
