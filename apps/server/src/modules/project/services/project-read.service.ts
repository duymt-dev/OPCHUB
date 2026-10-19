import { Injectable } from '@nestjs/common';
import type { ProjectCard, ProjectDetail, ProjectStats } from '@opchub/shared/api-domains';
import { notFound } from '@/common/errors';
import { describe, repoOf, toProjectCard } from '../domain/project.mapper';
import { ProjectRevisionRepository } from '../repositories/project-revision.repository';
import { type ExploreFilter, ProjectRepository } from '../repositories/project.repository';
import { ProjectRevisionService } from './project-revision.service';

const NOT_FOUND = 'Không tìm thấy dự án';
const OTHER_COLOR = '#8C8C8C';
const vnDate = (d: Date) => d.toLocaleDateString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' });

type Update = ProjectDetail['updates'][number];

/**
 * BUG-038: tab "Cập nhật" = mốc thật, mới trước — bản sửa được duyệt (≤ 5), xuất bản, tạo dự án
 */
function milestones(
  r: { createdAt: Date; publishedAt: Date | null },
  approved: readonly { decidedAt: Date | null }[],
): Update[] {
  const out: Update[] = approved.flatMap((a) =>
    a.decidedAt
      ? [
          {
            date: vnDate(a.decidedAt),
            title: 'Cập nhật được duyệt',
            body: 'Nội dung dự án được cập nhật sau khi quản trị viên duyệt.',
            tone: 'blue' as const,
          },
        ]
      : [],
  );
  if (r.publishedAt) {
    out.push({
      date: vnDate(r.publishedAt),
      title: 'Xuất bản trên OPC Hub',
      body: 'Dự án được công khai trong cộng đồng.',
      tone: 'green',
    });
  }
  out.push({
    date: vnDate(r.createdAt),
    title: 'Tạo dự án',
    body: 'Chủ dự án tạo hồ sơ dự án trên OPC Hub.',
    tone: 'gray',
  });
  return out;
}

/** Khám phá + chi tiết + Dự án của tôi (BR-08) */
@Injectable()
export class ProjectReadService {
  constructor(
    private readonly repo: ProjectRepository,
    private readonly revisionRepo: ProjectRevisionRepository,
    private readonly revisions: ProjectRevisionService,
  ) {}

  async explore(userId: string, f: ExploreFilter, page: number, size: number) {
    const { rows, total } = await this.repo.explore(userId, f, page, size);
    const followed = await this.repo.followedAmong(
      userId,
      rows.map((r) => r.id),
    );
    return {
      items: rows.map((r) => toProjectCard(r, followed.has(r.id))),
      page,
      size,
      total,
    };
  }

  async mine(userId: string): Promise<{ items: ProjectCard[] }> {
    const rows = await this.repo.mine(userId);
    const followed = await this.repo.followedAmong(
      userId,
      rows.map((r) => r.id),
    );
    const cards = rows.map((r) => toProjectCard(r, followed.has(r.id)));
    return { items: await this.revisions.withRevisions(cards) };
  }

  async detail(userId: string, id: string): Promise<ProjectDetail> {
    const r = await this.repo.findVisible(userId, id);
    if (!r) throw notFound(NOT_FOUND);
    return this.buildDetail(userId, r, describe(r, r.descriptionHtml), false);
  }

  /**
   * Bản của chủ dự án (mọi trạng thái) để sửa — mô tả + ảnh bìa nguyên bản; có bản sửa mở thì
   * trả nội dung bản sửa (D-18). API công khai `detail` không bao giờ đọc bản sửa.
   */
  async ownDetail(userId: string, id: string): Promise<ProjectDetail> {
    const r = await this.repo.findOwned(userId, id);
    if (!r) throw notFound(NOT_FOUND);
    return this.revisions.ownDetail(await this.buildDetail(userId, r, r.descriptionHtml, true), r);
  }

  private async buildDetail(
    userId: string,
    r: NonNullable<Awaited<ReturnType<ProjectRepository['findOwned']>>>,
    description: string,
    raw: boolean,
  ): Promise<ProjectDetail> {
    const [ctx, related, approved] = await Promise.all([
      this.repo.viewerContext(userId, r.id),
      raw ? Promise.resolve([]) : this.repo.related(userId, r.id),
      this.revisionRepo.approvedDates(r.id),
    ]);
    const card = toProjectCard(r, ctx.followed, raw);
    return {
      ...card,
      description,
      // BUG-038 (Q-B32-1): chưa có nguồn nhập điểm nổi bật / thư viện ảnh → rỗng, FE ẩn khối
      highlights: [],
      gallery: r.coverUrl ? [r.coverUrl] : [],
      updates: milestones(r, approved),
      testUrl: r.testUrl,
      repo: repoOf(r),
      repoAccessRequested: ctx.repoRequested,
      isOwner: r.ownerId === userId,
      contact: ctx.contact,
      pledged: (card.funding?.raised ?? 0) + Number(ctx.interestSum),
      interestCount: ctx.interestCount,
      deckUrl: r.deckUrl,
      myInterest: ctx.mine
        ? {
            amount: Number(ctx.mine.amount),
            currency: ctx.mine.currency === 'USD' ? 'USD' : 'VND',
            threadKey: ctx.mine.id,
          }
        : null,
      groupIds: r.shares.map((s) => s.groupId),
      related: related.map((x) => ({
        id: x.id,
        name: x.name,
        category: x.category?.name ?? '',
        tone: x.tone,
      })),
    };
  }

  async stats(userId: string): Promise<ProjectStats> {
    const s = await this.repo.stats(userId);
    const count = new Map(s.byCat.map((c) => [c.categoryId, c._count._all]));
    const known = new Set(s.cats.map((c) => c.id));
    const categories = s.cats
      .filter((c) => !c.hidden && c.scopes.includes('project'))
      .map((c) => ({ name: c.name, color: c.color, count: count.get(c.id) ?? 0 }));
    const orphan = s.byCat
      .filter((c) => c.categoryId && !known.has(c.categoryId))
      .reduce((a, c) => a + c._count._all, 0);
    if (orphan) categories.push({ name: 'Khác', color: OTHER_COLOR, count: orphan });
    const total = s.byStage.reduce((a, x) => a + x._count._all, 0);
    const growing = s.byStage
      .filter((x) => x.stage === 'growth' || x.stage === 'launched')
      .reduce((a, x) => a + x._count._all, 0);
    const featuredId = await this.repo.featuredId(userId);
    const featured = featuredId ? await this.repo.findVisible(userId, featuredId) : null;
    const followed = featured
      ? await this.repo.followedAmong(userId, [featured.id])
      : new Set<string>();
    return {
      total,
      growing,
      countries: s.countries,
      following: s.following,
      categories,
      featured: featured
        ? {
            ...toProjectCard(featured, followed.has(featured.id)),
            description: describe(featured, featured.descriptionHtml),
          }
        : null,
    };
  }
}
