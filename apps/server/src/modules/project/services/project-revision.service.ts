import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { AdminReviewDecision, ProjectCard, ProjectDetail } from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { conflict } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  fromRevisionData,
  overlayOwnDetail,
  type Prepared,
  type RevisionRow,
  toRevisionData,
} from '../domain/project-revision.data';
import type { ProjectRow } from '../domain/project.mapper';
import { REVISION_TRANSITIONS, revisionSaveStatus } from '../domain/project-status';
import { ProjectRevisionRepository } from '../repositories/project-revision.repository';
import { ProjectWriteRepository } from '../repositories/project-write.repository';

export interface RevisionActor {
  id: string;
  ip: string | null;
}

const ref = (r: RevisionRow | undefined): ProjectCard['revision'] =>
  r ? { status: r.status, reviewNote: r.reviewNote } : null;

/**
 * Bản sửa dự án Đang hiển thị (REQ-106, D-18): chủ dự án sửa → ghi `project_revisions`, bản công
 * khai giữ nguyên tới khi Admin duyệt. Duyệt → áp nội dung vào `projects` + con trong 1 tx.
 */
@Injectable()
export class ProjectRevisionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: ProjectRevisionRepository,
    private readonly write: ProjectWriteRepository,
    private readonly audit: AuditService,
  ) {}

  /** Chủ dự án lưu bản sửa: tạo mới hoặc cập nhật CÙNG bản đang mở (gửi → Chờ duyệt) */
  async save(
    userId: string,
    projectId: string,
    prepared: Prepared,
    category: string,
    submit: boolean,
  ): Promise<void> {
    await this.prisma.db.$transaction(async (tx) => {
      // Khoá dòng dự án: còn Đang hiển thị mới ghi bản sửa (Admin vừa ẩn → 409)
      const live = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM projects
        WHERE id = ${projectId} AND owner_id = ${userId} AND deleted_at IS NULL
          AND status = 'published'
        FOR UPDATE`;
      if (!live.length) throw conflict('Trạng thái dự án không cho phép sửa');
      await this.repo.upsertOpen(
        tx,
        projectId,
        userId,
        toRevisionData(prepared, category),
        revisionSaveStatus(submit),
      );
    });
  }

  /** "Dự án của tôi": gắn nhãn bản sửa chưa áp (1 query cho cả danh sách) */
  async withRevisions(cards: ProjectCard[]): Promise<ProjectCard[]> {
    const live = cards.filter((c) => c.status === 'published' || c.status === 'hidden');
    const revs = await this.repo.latestOf(live.map((c) => c.id));
    return cards.map((c) => ({ ...c, revision: ref(revs.get(c.id)) }));
  }

  /** Form sửa: nội dung bản sửa mở (nếu có) để chủ dự án sửa tiếp */
  async ownDetail(base: ProjectDetail, row: ProjectRow): Promise<ProjectDetail> {
    const revs = await this.repo.latestOf([row.id]);
    const rev = revs.get(row.id);
    if (!rev) return base;
    const withRef = { ...base, revision: ref(rev) };
    return rev.status === 'rejected' ? withRef : { ...overlayOwnDetail(withRef, row, rev.data) };
  }

  /**
   * Admin quyết định bản sửa Chờ duyệt trong tx của service gọi. Không có bản sửa → `false`
   * (service gọi dùng `REVIEW_TRANSITIONS` của dự án như cũ).
   */
  async review(
    tx: DbTx,
    actor: RevisionActor,
    projectId: string,
    decision: AdminReviewDecision,
    note: string | undefined,
  ): Promise<boolean> {
    const t = REVISION_TRANSITIONS[decision];
    if (!t) return false;
    const rev = await this.repo.findPending(tx, projectId);
    if (!rev) return false;
    if (!(await this.repo.transition(tx, rev.id, t.from, t.to, note))) {
      throw conflict('Bản sửa vừa được xử lý bởi thao tác khác');
    }
    if (decision === 'approve') {
      const p = fromRevisionData(rev.data);
      if (!(await this.write.applyContent(tx, projectId, p.data))) {
        throw conflict('Trạng thái dự án không cho phép áp bản sửa');
      }
      await this.write.writeChildren(tx, projectId, p);
    }
    await this.audit.log(tx, {
      actorId: actor.id,
      action: `project.revision_${decision}`,
      entity: 'project',
      entityId: projectId,
      tag: 'project',
      summary: (note ?? rev.data.name).slice(0, 500),
      ip: actor.ip,
    });
    return true;
  }
}
