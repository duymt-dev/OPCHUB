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
import { describe, toAdminProject } from '../domain/project.mapper';
import { PROJECT_STATUSES, REVIEW_TRANSITIONS } from '../domain/project-status';
import { ProjectAdminRepository } from '../repositories/project-admin.repository';

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
  ) {}

  async page(q: {
    status?: ProjectStatus | undefined;
    q?: string | undefined;
    page: number;
    size: number;
  }) {
    const { rows, total } = await this.repo.page(q.status, q.q, q.page, q.size);
    return {
      items: rows.map((r) => toAdminProject(r, describe(r, r.descriptionHtml))),
      page: q.page,
      size: q.size,
      total,
    };
  }

  async detail(id: string): Promise<AdminProject> {
    const r = await this.repo.find(id);
    if (!r) throw notFound(NOT_FOUND);
    return toAdminProject(r, describe(r, r.descriptionHtml));
  }

  async review(actor: Actor, id: string, body: AdminProjectReview): Promise<AdminProject> {
    const t = REVIEW_TRANSITIONS[body.decision];
    await this.prisma.db.$transaction(async (tx) => {
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
    const rows = await this.repo.counts();
    const at = new Map(rows.map((r) => [r.status, r.n]));
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
