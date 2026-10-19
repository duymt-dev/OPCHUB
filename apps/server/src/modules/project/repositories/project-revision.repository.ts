import { Injectable } from '@nestjs/common';
import type { DbTx, ProjectRevisionStatus } from '@opchub/db';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  type RevisionData,
  revisionDataSchema,
  type RevisionRow,
} from '../domain/project-revision.data';
import { REVISION_OPEN } from '../domain/project-status';

const REVISION_SELECT = {
  id: true,
  projectId: true,
  status: true,
  reviewNote: true,
  updatedAt: true,
  data: true,
} as const;

const UNAPPLIED: readonly ProjectRevisionStatus[] = [...REVISION_OPEN, 'rejected'];

type Raw = { data: unknown } & Omit<RevisionRow, 'data'>;
const parse = (r: Raw): RevisionRow => ({ ...r, data: revisionDataSchema.parse(r.data) });

/** Bản sửa dự án đang hiển thị (REQ-106, D-18) — `project_revisions` */
@Injectable()
export class ProjectRevisionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Bản sửa còn mở (tối đa 1 — UQ partial `project_revisions_open`) */
  async findOpen(projectId: string, db: DbTx | PrismaService['db'] = this.prisma.db) {
    const r = await db.projectRevision.findFirst({
      where: { projectId, status: { in: [...REVISION_OPEN] } },
      select: REVISION_SELECT,
    });
    return r ? parse(r) : null;
  }

  /** Bản sửa đang Chờ duyệt của dự án (Admin duyệt) */
  async findPending(tx: DbTx, projectId: string) {
    const r = await tx.projectRevision.findFirst({
      where: { projectId, status: 'pending_review' },
      select: REVISION_SELECT,
    });
    return r ? parse(r) : null;
  }

  /**
   * Bản sửa gần nhất của từng dự án trong các trạng thái cho trước — 1 query cho cả trang (luật 5,
   * không query trong vòng lặp). Mặc định: chưa áp (mở hoặc bị từ chối); `approved` đã thành bản
   * hiển thị. Số bản sửa mỗi dự án nhỏ nên `distinct` của Prisma lọc ở bộ nhớ là đủ.
   */
  async latestOf(
    projectIds: readonly string[],
    statuses: readonly ProjectRevisionStatus[] = UNAPPLIED,
  ): Promise<Map<string, RevisionRow>> {
    if (!projectIds.length) return new Map();
    const rows = await this.prisma.db.projectRevision.findMany({
      where: { projectId: { in: [...projectIds] }, status: { in: [...statuses] } },
      select: REVISION_SELECT,
      orderBy: [{ projectId: 'asc' }, { updatedAt: 'desc' }],
      distinct: ['projectId'],
    });
    return new Map(rows.map((r) => [r.projectId, parse(r)]));
  }

  /**
   * Ghi bản sửa mở: chưa có → tạo, có → cập nhật CÙNG dòng (không tạo bản thứ 2). Một câu
   * `INSERT … ON CONFLICT` trên UQ partial nên hai lần lưu song song không vỡ ràng buộc.
   */
  async upsertOpen(
    tx: DbTx,
    projectId: string,
    userId: string,
    data: RevisionData,
    status: ProjectRevisionStatus,
  ): Promise<void> {
    await tx.$executeRaw`
      INSERT INTO project_revisions (id, project_id, data, status, created_by, updated_at)
      VALUES (${randomUUID()}, ${projectId}, ${JSON.stringify(data)}::jsonb,
              ${status}::project_revision_status, ${userId}, now())
      ON CONFLICT (project_id) WHERE status IN ('draft', 'pending_review', 'needs_changes')
      DO UPDATE SET data = EXCLUDED.data, status = EXCLUDED.status, updated_at = now()`;
  }

  /** Transition có điều kiện (luật 7): `WHERE id AND status = from` */
  async transition(
    tx: DbTx,
    id: string,
    from: ProjectRevisionStatus,
    to: ProjectRevisionStatus,
    note: string | undefined,
  ): Promise<boolean> {
    const r = await tx.projectRevision.updateMany({
      where: { id, status: from },
      data: { status: to, decidedAt: new Date(), ...(note ? { reviewNote: note } : {}) },
    });
    return r.count === 1;
  }

  /** Số bản sửa Chờ duyệt của dự án còn sống — index `(status, updated_at)` */
  countPending(): Promise<number> {
    return this.prisma.db.projectRevision.count({
      where: { status: 'pending_review', project: { deletedAt: null } },
    });
  }

  /** Mốc "Cập nhật được duyệt" (BUG-038): ≤ 5 bản mới nhất, 1 query */
  approvedDates(projectId: string): Promise<{ decidedAt: Date | null }[]> {
    return this.prisma.db.projectRevision.findMany({
      where: { projectId, status: 'approved' },
      select: { decidedAt: true },
      orderBy: { decidedAt: 'desc' },
      take: 5,
    });
  }
}
