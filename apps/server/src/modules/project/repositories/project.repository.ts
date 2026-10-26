import { Injectable } from '@nestjs/common';
import type { Prisma } from '@opchub/db';
import type { ProjectAudience, ProjectNeed, ProjectStage } from '@opchub/shared';
import type { ProjectSort, ProjectStageFilter } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PROJECT_CARD_SELECT, type ProjectRow } from '../domain/project.mapper';

export interface ExploreFilter {
  cat?: string | undefined;
  stage?: ProjectStageFilter | undefined;
  q?: string | undefined;
  sort: ProjectSort;
  /** D-89 (v4): bộ lọc bên trái của Khám phá */
  audience?: ProjectAudience | undefined;
  provinces?: string[] | undefined;
  stages?: ProjectStage[] | undefined;
  needs?: ProjectNeed[] | undefined;
}

const ORDERS: Record<ProjectSort, Prisma.ProjectOrderByWithRelationInput[]> = {
  new: [{ publishedAt: 'desc' }, { id: 'desc' }],
  follow: [{ followersCount: 'desc' }, { id: 'asc' }],
  view: [{ viewCount: 'desc' }, { id: 'asc' }],
  name: [{ name: 'asc' }, { id: 'asc' }],
};

/**
 * BR-08: thấy dự án khi đang hiển thị VÀ (công khai | chủ dự án | thành viên đội | thành viên nhóm
 * được chia sẻ). Không thấy → 404 ở service (không lộ sự tồn tại).
 * NA-16 (V2Q-61): nhánh công khai chỉ khi chủ dự án đang `active` — TK bị khoá thì dự án tạm ẩn,
 * mở khoá tự hiện lại (không đổi `projects.status`). Join `users` theo PK `owner_id`.
 */
export function visibleTo(userId: string): Prisma.ProjectWhereInput {
  return {
    status: 'published',
    deletedAt: null,
    OR: [
      { visibility: 'public', owner: { status: 'active' } },
      { ownerId: userId },
      { members: { some: { userId } } },
      { shares: { some: { group: { members: { some: { userId, status: 'member' } } } } } },
    ],
  };
}

/** Đọc dự án: Khám phá, chi tiết, Dự án của tôi */
@Injectable()
export class ProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  private exploreWhere(userId: string, f: ExploreFilter): Prisma.ProjectWhereInput {
    const and: Prisma.ProjectWhereInput[] = [visibleTo(userId)];
    if (f.cat) and.push({ category: { name: f.cat } });
    // V4-610: "Đang gọi vốn" = có khai báo + Gói Gọi vốn đang hiệu lực
    if (f.stage === 'fund') {
      and.push({
        funding: { isNot: null },
        fundraisings: { some: { status: 'active', endsAt: { gt: new Date() } } },
      });
    } else if (f.stage) and.push({ stage: f.stage });
    if (f.audience) and.push({ audience: f.audience });
    if (f.stages?.length) and.push({ stage: { in: f.stages } });
    if (f.needs?.length) and.push({ needs: { hasSome: f.needs } });
    // Địa phương = tỉnh của nhóm dự án (FK `group_id` → PK groups)
    if (f.provinces?.length) and.push({ group: { province: { in: f.provinces } } });
    if (f.q) {
      and.push({
        OR: [
          { name: { contains: f.q, mode: 'insensitive' } },
          { summary: { contains: f.q, mode: 'insensitive' } },
          { owner: { fullName: { contains: f.q, mode: 'insensitive' } } },
          { group: { province: { contains: f.q, mode: 'insensitive' } } },
          { category: { name: { contains: f.q, mode: 'insensitive' } } },
        ],
      });
    }
    return { AND: and };
  }

  /** Deferred join (luật 7): trang id theo index sắp xếp, rồi mới lấy cột + quan hệ cho đúng N dòng */
  async explore(userId: string, f: ExploreFilter, page: number, size: number) {
    const where = this.exploreWhere(userId, f);
    const [ids, total] = await Promise.all([
      this.prisma.db.project.findMany({
        where,
        select: { id: true },
        orderBy: ORDERS[f.sort],
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.db.project.count({ where }),
    ]);
    return { rows: await this.byIds(ids.map((r) => r.id)), total };
  }

  /** Giữ thứ tự id truyền vào */
  async byIds(ids: readonly string[]): Promise<ProjectRow[]> {
    if (!ids.length) return [];
    const rows = await this.prisma.db.project.findMany({
      where: { id: { in: [...ids] } },
      select: PROJECT_CARD_SELECT,
    });
    const at = new Map(rows.map((r) => [r.id, r]));
    return ids.flatMap((id) => at.get(id) ?? []);
  }

  findVisible(userId: string, id: string) {
    return this.prisma.db.project.findFirst({
      where: { id, ...visibleTo(userId) },
      select: { ...PROJECT_CARD_SELECT, descriptionHtml: true, highlights: true, gallery: true },
    });
  }

  findOwned(userId: string, id: string) {
    return this.prisma.db.project.findFirst({
      where: { id, ownerId: userId, deletedAt: null },
      select: { ...PROJECT_CARD_SELECT, descriptionHtml: true, highlights: true, gallery: true },
    });
  }

  /** idx projects (owner_id, updated_at DESC) */
  async mine(userId: string): Promise<ProjectRow[]> {
    const ids = await this.prisma.db.project.findMany({
      where: { ownerId: userId, deletedAt: null },
      select: { id: true },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    return this.byIds(ids.map((r) => r.id));
  }

  async followedAmong(userId: string, ids: readonly string[]): Promise<Set<string>> {
    if (!ids.length) return new Set();
    const rows = await this.prisma.db.projectFollow.findMany({
      where: { userId, projectId: { in: [...ids] } },
      select: { projectId: true },
    });
    return new Set(rows.map((r) => r.projectId));
  }

  /** V4-610: tab "Dự án liên quan" của prototype v4 hiện tối đa 6 */
  async related(userId: string, excludeId: string): Promise<ProjectRow[]> {
    const ids = await this.prisma.db.project.findMany({
      where: { AND: [visibleTo(userId), { id: { not: excludeId } }] },
      select: { id: true },
      orderBy: ORDERS.new,
      take: 6,
    });
    return this.byIds(ids.map((r) => r.id));
  }

  /**
   * Ngữ cảnh chi tiết của người xem: theo dõi, đã xin repo, quan tâm đầu tư (PK/UQ).
   * Liên hệ = kênh chủ dự án tự công khai trên dự án — KHÔNG đọc `users` (BUG-016, NĐ 13/2023).
   */
  async viewerContext(userId: string, projectId: string) {
    const [follow, repoAsk, mine, agg, pub] = await Promise.all([
      this.prisma.db.projectFollow.findUnique({
        where: { projectId_userId: { projectId, userId } },
        select: { userId: true },
      }),
      this.prisma.db.repoAccessRequest.findUnique({
        where: { projectId_userId: { projectId, userId } },
        select: { userId: true },
      }),
      this.prisma.db.investorInterest.findUnique({
        where: { projectId_userId: { projectId, userId } },
        select: { id: true, amount: true, currency: true },
      }),
      this.prisma.db.investorInterest.aggregate({
        where: { projectId },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.db.project.findUniqueOrThrow({
        where: { id: projectId },
        select: { contactEmail: true, contactPhone: true, contactAddress: true },
      }),
    ]);
    return {
      followed: follow !== null,
      repoRequested: repoAsk !== null,
      mine,
      interestSum: agg._sum.amount ?? 0n,
      interestCount: agg._count,
      contact: { email: pub.contactEmail, phone: pub.contactPhone, address: pub.contactAddress },
    };
  }

  /** `/projects/stats`: gom nhóm theo lĩnh vực / giai đoạn / quốc gia trên tập người xem thấy */
  async stats(userId: string) {
    const where = visibleTo(userId);
    const db = this.prisma.db;
    const [byCat, byStage, byCountry, following, cats, owners, comments] = await Promise.all([
      db.project.groupBy({ by: ['categoryId'], where, _count: { _all: true } }),
      db.project.groupBy({ by: ['stage'], where, _count: { _all: true } }),
      db.project.groupBy({ by: ['country'], where }),
      db.projectFollow.count({ where: { userId } }),
      db.category.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, color: true, scopes: true, hidden: true },
        orderBy: [{ sort: 'asc' }, { name: 'asc' }],
      }),
      db.project.groupBy({ by: ['ownerId'], where }),
      db.project.aggregate({ where, _sum: { commentCount: true } }),
    ]);
    return {
      byCat,
      byStage,
      countries: byCountry.length,
      following,
      cats,
      owners: owners.length,
      comments: comments._sum.commentCount ?? 0,
    };
  }

  /** Nổi bật: Admin đặt (Q-G5b-4), không có thì dự án nhiều theo dõi nhất */
  async featuredId(userId: string): Promise<string | null> {
    const where = visibleTo(userId);
    const pick =
      (await this.prisma.db.project.findFirst({
        where: { AND: [where, { featuredAt: { not: null } }] },
        select: { id: true },
      })) ??
      (await this.prisma.db.project.findFirst({
        where,
        select: { id: true },
        orderBy: ORDERS.follow,
      }));
    return pick?.id ?? null;
  }

  /** Lượt xem chi tiết (người khác chủ dự án) — cập nhật theo PK, không đọc lại */
  async addView(id: string): Promise<void> {
    await this.prisma.db.project.updateMany({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  async description(id: string): Promise<string> {
    const r = await this.prisma.db.project.findUnique({
      where: { id },
      select: { descriptionHtml: true },
    });
    return r?.descriptionHtml ?? '';
  }
}
