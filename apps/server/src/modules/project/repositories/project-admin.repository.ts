import { Injectable } from '@nestjs/common';
import type { DbTx, Prisma, ProjectStatus } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PROJECT_CARD_SELECT, type ProjectRow } from '../domain/project.mapper';

const LIVE = { deletedAt: null } as const;

/** Admin "Kiểm duyệt dự án": danh sách, chuyển trạng thái có điều kiện, nổi bật, đếm */
@Injectable()
export class ProjectAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deferred join trên `projects_admin` / `projects_live_recent` (status, created_at DESC). Tab Chờ
   * duyệt = dự án `pending_review` ∪ dự án có bản sửa Chờ duyệt (REQ-106, nhãn "Bản sửa").
   */
  async page(status: ProjectStatus | undefined, q: string | undefined, page: number, size: number) {
    const byStatus: Prisma.ProjectWhereInput =
      status === 'pending_review'
        ? { OR: [{ status }, { revisions: { some: { status: 'pending_review' } } }] }
        : status
          ? { status }
          : {};
    const where: Prisma.ProjectWhereInput = {
      ...LIVE,
      ...byStatus,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { owner: { fullName: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [ids, total] = await Promise.all([
      this.prisma.db.project.findMany({
        where,
        select: { id: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.db.project.count({ where }),
    ]);
    return { rows: await this.byIds(ids.map((r) => r.id)), total };
  }

  async byIds(ids: readonly string[]) {
    if (!ids.length) return [];
    const rows = await this.prisma.db.project.findMany({
      where: { id: { in: [...ids] } },
      select: { ...PROJECT_CARD_SELECT, descriptionHtml: true },
    });
    const at = new Map(rows.map((r) => [r.id, r]));
    return ids.flatMap((id) => at.get(id) ?? []);
  }

  find(id: string): Promise<(ProjectRow & { descriptionHtml: string }) | null> {
    return this.prisma.db.project.findFirst({
      where: { id, ...LIVE },
      select: { ...PROJECT_CARD_SELECT, descriptionHtml: true },
    });
  }

  /**
   * Transition có điều kiện (luật 7): `WHERE status = from`. Rời "Đang hiển thị" → bỏ nổi bật.
   * Ghi chú duyệt chỉ ghi đè khi có.
   */
  async transition(
    tx: DbTx,
    ids: readonly string[],
    from: ProjectStatus,
    to: ProjectStatus,
    note: string | undefined,
  ): Promise<{ id: string; name: string }[]> {
    if (!ids.length) return [];
    return tx.project.updateManyAndReturn({
      where: { id: { in: [...ids] }, status: from, ...LIVE },
      data: {
        status: to,
        ...(note ? { reviewNote: note } : {}),
        ...(to === 'published' ? { publishedAt: new Date() } : { featuredAt: null }),
      },
      select: { id: true, name: true },
    });
  }

  /** Xoá mềm; bỏ nổi bật */
  softDelete(tx: DbTx, ids: readonly string[]): Promise<{ id: string; name: string }[]> {
    return tx.project.updateManyAndReturn({
      where: { id: { in: [...ids] }, ...LIVE },
      data: { deletedAt: new Date(), featuredAt: null },
      select: { id: true, name: true },
    });
  }

  /** UQ partial `projects_one_featured`: bỏ cũ rồi đặt mới, cùng transaction */
  async setFeatured(tx: DbTx, id: string | null): Promise<'ok' | 'not_published'> {
    await tx.project.updateMany({
      where: { featuredAt: { not: null } },
      data: { featuredAt: null },
    });
    if (!id) return 'ok';
    const r = await tx.project.updateMany({
      where: { id, status: 'published', ...LIVE },
      data: { featuredAt: new Date() },
    });
    return r.count === 1 ? 'ok' : 'not_published';
  }

  exists(id: string) {
    return this.prisma.db.project.findFirst({ where: { id, ...LIVE }, select: { name: true } });
  }

  /**
   * Đếm theo 6 trạng thái: mỗi trạng thái một Index Only Scan trên `projects_admin`
   * (status đứng đầu) — tránh Seq Scan của GROUP BY toàn bảng (luật 7).
   */
  counts() {
    return this.prisma.db.$queryRaw<{ status: ProjectStatus; n: number }[]>`
      SELECT s.status, (
        SELECT count(*)::int FROM projects p WHERE p.status = s.status AND p.deleted_at IS NULL
      ) AS n
      FROM unnest(enum_range(NULL::project_status)) AS s(status)`;
  }
}
