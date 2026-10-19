import { Injectable } from '@nestjs/common';
import type { DbTx, ProjectStatus } from '@opchub/db';
import type {
  AdminProject,
  AdminProjectReview,
  ProjectBulkAction,
  ProjectBulkResult,
  ProjectCounts,
} from '@opchub/shared/api-domains';
import { projectCountsSchema } from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { conflict, notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { toAdminRevision } from '../domain/project-revision.data';
import { describe, type ProjectRow, toAdminProject } from '../domain/project.mapper';
import { PROJECT_STATUSES, REVIEW_TRANSITIONS } from '../domain/project-status';
import { ProjectAdminRepository } from '../repositories/project-admin.repository';
import { ProjectRevisionRepository } from '../repositories/project-revision.repository';
import { ProjectRevisionService } from './project-revision.service';

export interface Actor {
  id: string;
  ip: string | null;
}

const NOT_FOUND = 'Không tìm thấy dự án';

/** Admin "Kiểm duyệt dự án" (`p.pub`) — mọi thao tác ghi audit tag `project` cùng transaction */
@Injectable()
export class ProjectAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: ProjectAdminRepository,
    private readonly audit: AuditService,
    private readonly revisionRepo: ProjectRevisionRepository,
    private readonly revisions: ProjectRevisionService,
  ) {}

  /** DTO Admin + bản sửa chưa áp (1 query cho cả trang — luật 5) */
  private async toAdmin(rows: (ProjectRow & { descriptionHtml: string })[]) {
    const revs = await this.revisionRepo.latestOf(rows.map((r) => r.id));
    return rows.map((r) => {
      const rev = revs.get(r.id);
      return {
        ...toAdminProject(r, describe(r, r.descriptionHtml)),
        revision: rev ? toAdminRevision(rev, r) : null,
      };
    });
  }

  async page(q: {
    status?: ProjectStatus | undefined;
    q?: string | undefined;
    page: number;
    size: number;
  }) {
    const { rows, total } = await this.repo.page(q.status, q.q, q.page, q.size);
    return {
      items: await this.toAdmin(rows),
      page: q.page,
      size: q.size,
      total,
    };
  }

  async detail(id: string): Promise<AdminProject> {
    const r = await this.repo.find(id);
    if (!r) throw notFound(NOT_FOUND);
    const [one] = await this.toAdmin([r]);
    if (!one) throw notFound(NOT_FOUND);
    return one;
  }

  /**
   * Có bản sửa Chờ duyệt → quyết định bản sửa (REQ-106; dự án vẫn Đang hiển thị); không có →
   * `REVIEW_TRANSITIONS` của dự án như cũ. Mọi bước có điều kiện + audit cùng tx.
   */
  async review(actor: Actor, id: string, body: AdminProjectReview): Promise<AdminProject> {
    const t = REVIEW_TRANSITIONS[body.decision];
    await this.prisma.db.$transaction(async (tx) => {
      if (await this.revisions.review(tx, actor, id, body.decision, body.note)) return;
      const done = await this.repo.transition(tx, [id], t.from, t.to, body.note);
      if (!done.length) {
        if (!(await this.repo.exists(id))) throw notFound(NOT_FOUND);
        throw conflict('Trạng thái dự án không cho phép thao tác này');
      }
      await this.log(tx, actor, `project.${body.decision}`, id, body.note ?? '');
    });
    return this.detail(id);
  }

  /** Mỗi id thử đúng transition; không đủ điều kiện → `skipped` (luật 7) */
  async bulk(actor: Actor, ids: string[], action: ProjectBulkAction): Promise<ProjectBulkResult> {
    const uniq = [...new Set(ids)];
    const done = await this.prisma.db.$transaction(async (tx) => {
      if (action === 'delete') {
        const rows = await this.repo.softDelete(tx, uniq);
        await this.logMany(tx, actor, 'project.delete', rows);
        return rows.map((r) => r.id);
      }
      if (action === 'hide') {
        const rows = await this.repo.transition(tx, uniq, 'published', 'hidden', undefined);
        await this.logMany(tx, actor, 'project.hide', rows);
        return rows.map((r) => r.id);
      }
      const approved = await this.repo.transition(
        tx,
        uniq,
        'pending_review',
        'published',
        undefined,
      );
      const rest = uniq.filter((id) => !approved.some((a) => a.id === id));
      const republished = await this.repo.transition(tx, rest, 'hidden', 'published', undefined);
      await this.logMany(tx, actor, 'project.approve', approved);
      await this.logMany(tx, actor, 'project.republish', republished);
      return [...approved, ...republished].map((r) => r.id);
    });
    const ok = new Set(done);
    return { done: uniq.filter((id) => ok.has(id)), skipped: uniq.filter((id) => !ok.has(id)) };
  }

  async remove(actor: Actor, id: string): Promise<{ id: string }> {
    await this.prisma.db.$transaction(async (tx) => {
      const rows = await this.repo.softDelete(tx, [id]);
      if (!rows.length) throw notFound(NOT_FOUND);
      await this.logMany(tx, actor, 'project.delete', rows);
    });
    return { id };
  }

  async feature(actor: Actor, projectId: string | null): Promise<{ projectId: string | null }> {
    if (projectId && !(await this.repo.exists(projectId))) throw notFound(NOT_FOUND);
    await this.prisma.db.$transaction(async (tx) => {
      if ((await this.repo.setFeatured(tx, projectId)) === 'not_published') {
        throw conflict('Chỉ đặt nổi bật cho dự án đang hiển thị');
      }
      await this.log(
        tx,
        actor,
        projectId ? 'project.feature' : 'project.unfeature',
        projectId ?? 'featured',
        '',
      );
    });
    return { projectId };
  }

  async counts(): Promise<ProjectCounts> {
    const [rows, revisions] = await Promise.all([
      this.repo.counts(),
      this.revisionRepo.countPending(),
    ]);
    const at = new Map(rows.map((r) => [r.status, r.n]));
    // Tab Chờ duyệt gồm cả bản sửa chờ duyệt (REQ-106)
    at.set('pending_review', (at.get('pending_review') ?? 0) + revisions);
    return projectCountsSchema.parse(
      Object.fromEntries(PROJECT_STATUSES.map((s) => [s, at.get(s) ?? 0])),
    );
  }

  private log(tx: DbTx, actor: Actor, action: string, entityId: string, summary: string) {
    return this.audit.log(tx, {
      actorId: actor.id,
      action,
      entity: 'project',
      entityId,
      tag: 'project',
      summary: summary.slice(0, 500),
      ip: actor.ip,
    });
  }

  private logMany(tx: DbTx, actor: Actor, action: string, rows: { id: string; name: string }[]) {
    return this.audit.logMany(
      tx,
      rows.map((r) => ({
        actorId: actor.id,
        action,
        entity: 'project',
        entityId: r.id,
        tag: 'project' as const,
        summary: r.name.slice(0, 500),
        ip: actor.ip,
      })),
    );
  }
}
