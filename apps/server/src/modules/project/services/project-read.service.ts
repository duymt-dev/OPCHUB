import { Injectable } from '@nestjs/common';
import type { ProjectCard, ProjectDetail, ProjectStats } from '@opchub/shared/api-domains';
import { notFound } from '@/common/errors';
import { describe, repoOf, toProjectCard } from '../domain/project.mapper';
import { type ExploreFilter, ProjectRepository } from '../repositories/project.repository';

const NOT_FOUND = 'Không tìm thấy dự án';
const OTHER_COLOR = '#8C8C8C';
const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=500&h=300&fit=crop&auto=format`;

/**
 * Phần trình bày cố định của trang chi tiết (prototype: điểm nổi bật, thư viện ảnh, cập nhật) —
 * chưa có nguồn dữ liệu riêng (Q-B32-1).
 */
const GALLERY = [
  '1551288049-bebda4e38f71',
  '1460925895917-afdab827c52f',
  '1504868584819-f8e8b4b6d7e3',
];
const UPDATES = [
  {
    date: '15/10/2026',
    title: 'Ra mắt phiên bản 2.0',
    body: 'Bổ sung báo cáo tự động và tích hợp thanh toán QR.',
    tone: 'blue' as const,
  },
  {
    date: '28/09/2026',
    title: 'Đạt 1.000 người dùng',
    body: 'Mốc quan trọng sau 6 tháng ra mắt.',
    tone: 'green' as const,
  },
  {
    date: '02/09/2026',
    title: 'Tham gia Demo Day Q3',
    body: 'Nhận phản hồi từ 12 mentor và 3 quỹ đầu tư.',
    tone: 'amber' as const,
  },
];

const vnDate = (d: Date) => d.toLocaleDateString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' });

/** Khám phá + chi tiết + Dự án của tôi (BR-08) */
@Injectable()
export class ProjectReadService {
  constructor(private readonly repo: ProjectRepository) {}

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
    return { items: rows.map((r) => toProjectCard(r, followed.has(r.id))) };
  }

  async detail(userId: string, id: string): Promise<ProjectDetail> {
    const r = await this.repo.findVisible(userId, id);
    if (!r) throw notFound(NOT_FOUND);
    return this.buildDetail(userId, r, describe(r, r.descriptionHtml), false);
  }

  /** Bản của chủ dự án (mọi trạng thái) để sửa — mô tả + ảnh bìa nguyên bản */
  async ownDetail(userId: string, id: string): Promise<ProjectDetail> {
    const r = await this.repo.findOwned(userId, id);
    if (!r) throw notFound(NOT_FOUND);
    return this.buildDetail(userId, r, r.descriptionHtml, true);
  }

  private async buildDetail(
    userId: string,
    r: NonNullable<Awaited<ReturnType<ProjectRepository['findOwned']>>>,
    description: string,
    raw: boolean,
  ): Promise<ProjectDetail> {
    const [ctx, related] = await Promise.all([
      this.repo.viewerContext(userId, r.id),
      raw ? Promise.resolve([]) : this.repo.related(userId, r.id),
    ]);
    const card = toProjectCard(r, ctx.followed, raw);
    return {
      ...card,
      description,
      highlights: [
        {
          title: 'Vấn đề',
          body: 'Doanh nghiệp một người mất nhiều thời gian cho việc vận hành thủ công.',
        },
        { title: 'Giải pháp', body: r.summary },
        { title: 'Thị trường', body: 'Hơn 2 triệu doanh nghiệp siêu nhỏ tại ASEAN.' },
      ],
      gallery: GALLERY.map(unsplash),
      updates: [
        ...UPDATES,
        {
          date: vnDate(r.publishedAt ?? r.createdAt),
          title: 'Xuất bản trên OPC Hub',
          body: 'Dự án được công khai trong cộng đồng.',
          tone: 'gray',
        },
      ],
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
