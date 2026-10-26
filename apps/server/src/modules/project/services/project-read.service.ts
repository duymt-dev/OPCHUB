import { Injectable } from '@nestjs/common';
import type { ProjectCard, ProjectDetail, ProjectStats } from '@opchub/shared/api-domains';
import { notFound } from '@/common/errors';
import { describe, highlightsOf, repoOf, toProjectCard } from '../domain/project.mapper';
import { ProjectRevisionRepository } from '../repositories/project-revision.repository';
import { type ExploreFilter, ProjectRepository } from '../repositories/project.repository';
import { FundraisingRepository, type FundraisingRow } from '../repositories/fundraising.repository';
import { toFundraising } from './fundraising.service';
import { ProjectRevisionService } from './project-revision.service';

/** V4-610: khoản Gọi vốn gần nhất — chỉ gắn cho chủ dự án */
const withFundraising = <T extends ProjectCard>(c: T, f: FundraisingRow | undefined): T =>
  f ? { ...c, fundraising: toFundraising(f) } : c;

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
    private readonly fundraising: FundraisingRepository,
  ) {}

  async explore(userId: string, f: ExploreFilter, page: number, size: number) {
    const { rows, total } = await this.repo.explore(userId, f, page, size);
    const followed = await this.repo.followedAmong(
      userId,
      rows.map((r) => r.id),
    );
    return {
      items: rows.map((r) => toProjectCard(r, followed.has(r.id), false, userId)),
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
    const [cards, latest] = await Promise.all([
      this.revisions.withRevisions(
        rows.map((r) => toProjectCard(r, followed.has(r.id), false, userId)),
      ),
      this.fundraising.latestAmong(rows.map((r) => r.id)),
    ]);
    return { items: cards.map((c) => withFundraising(c, latest.get(c.id))) };
  }

  async detail(userId: string, id: string): Promise<ProjectDetail> {
    const r = await this.repo.findVisible(userId, id);
    if (!r) throw notFound(NOT_FOUND);
    // D-89 (v4): "lượt xem" trên thẻ — đếm lượt mở chi tiết của người khác chủ dự án
    if (r.ownerId !== userId) await this.repo.addView(r.id);
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
    const own = r.ownerId === userId;
    const [ctx, related, approved, latest] = await Promise.all([
      this.repo.viewerContext(userId, r.id),
      raw ? Promise.resolve([]) : this.repo.related(userId, r.id),
      this.revisionRepo.approvedDates(r.id),
      own ? this.fundraising.latestAmong([r.id]) : Promise.resolve(new Map<string, never>()),
    ]);
    const card = withFundraising(toProjectCard(r, ctx.followed, raw, userId), latest.get(r.id));
    return {
      ...card,
      description,
      // BUG-038: khối "Vấn đề / Giải pháp / Thị trường" + ảnh là dữ liệu của dự án; rỗng → FE ẩn
      highlights: highlightsOf(r.highlights),
      gallery: r.gallery.length ? r.gallery : r.coverUrl ? [r.coverUrl] : [],
      updates: milestones(r, approved),
      testUrl: r.testUrl,
      repo: repoOf(r, r.ownerId !== userId),
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
      // D-89 (v4) thẻ số ở hero: "Đơn vị tham gia" = số chủ dự án; "Kết nối thành công" như prototype
      // (`comments + 3 × total`) — chưa có bảng kết nối riêng (Q-V4-620-1)
      owners: s.owners,
      connections: s.comments + 3 * total,
      growing,
      countries: s.countries,
      following: s.following,
      categories,
      featured: featured
        ? {
            ...toProjectCard(featured, followed.has(featured.id), false, userId),
            description: describe(featured, featured.descriptionHtml),
          }
        : null,
    };
  }
}
