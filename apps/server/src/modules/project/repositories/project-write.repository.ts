import { Injectable } from '@nestjs/common';
import type { DbTx, ProjectStatus, ProjectVisibility, RepoProvider } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface ProjectWrite {
  name: string;
  categoryId: string | null;
  groupId: string | null;
  summary: string;
  descriptionHtml: string;
  stage: 'idea' | 'mvp' | 'growth' | 'launched';
  status: ProjectStatus;
  visibility: ProjectVisibility;
  tags: string[];
  website: string | null;
  coverUrl: string | null;
  testUrl: string | null;
  repoProvider: RepoProvider | null;
  repoUrl: string | null;
  repoVisibility: ProjectVisibility | null;
  deckUrl: string | null;
  /** Liên hệ công khai do chủ dự án nhập (BUG-016) */
  contactEmail: string | null;
  contactPhone: string | null;
}

/** Nội dung dự án (không trạng thái) — dùng chung cho ghi `projects` và bản sửa (D-18) */
export type ProjectContent = Omit<ProjectWrite, 'status'>;

export interface TeamWrite {
  name: string;
  role: string;
  avatarUrl: string | null;
  isOwner: boolean;
  userId: string | null;
}

export interface FundingWrite {
  amount: bigint;
  currency: 'VND' | 'USD';
  equityPct: number;
  minTicket: bigint;
  useOfFunds: string;
}

/** Ghi dự án + đội + gọi vốn + nhóm chia sẻ trong transaction của service */
@Injectable()
export class ProjectWriteRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Lĩnh vực theo tên (citext, UQ) — một query cho cả lô */
  async categoryId(name: string): Promise<string | null> {
    if (!name) return null;
    const c = await this.prisma.db.category.findFirst({
      where: { name, deletedAt: null },
      select: { id: true },
    });
    return c?.id ?? null;
  }

  /** Nhóm người gọi đang là thành viên trong danh sách id (BR-08: chỉ chia sẻ tới nhóm của mình) */
  async memberGroupIds(userId: string, groupIds: readonly string[]): Promise<string[]> {
    if (!groupIds.length) return [];
    const rows = await this.prisma.db.groupMember.findMany({
      where: {
        userId,
        status: 'member',
        groupId: { in: [...groupIds] },
        group: { deletedAt: null },
      },
      select: { groupId: true },
    });
    const ok = new Set(rows.map((r) => r.groupId));
    return groupIds.filter((g) => ok.has(g));
  }

  /** Nhóm "nhà" mặc định: nhóm đầu tiên người dùng tham gia */
  async homeGroupId(userId: string): Promise<string | null> {
    const r = await this.prisma.db.groupMember.findFirst({
      where: { userId, status: 'member', group: { deletedAt: null } },
      select: { groupId: true },
      orderBy: { createdAt: 'asc' },
    });
    return r?.groupId ?? null;
  }

  /** Thành viên đội khớp tên thành viên hệ thống → gắn `user_id` (Q-G3b-4) — 1 query */
  async userIdsByName(names: readonly string[]): Promise<Map<string, string>> {
    if (!names.length) return new Map();
    const rows = await this.prisma.db.user.findMany({
      where: { fullName: { in: [...names] }, status: 'active', deletedAt: null },
      select: { id: true, fullName: true },
    });
    return new Map(rows.map((r) => [r.fullName, r.id]));
  }

  async ownerProfile(userId: string) {
    return this.prisma.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { fullName: true, avatarUrl: true, businessProfile: { select: { country: true } } },
    });
  }

  create(tx: DbTx, id: string, ownerId: string, country: string, data: ProjectWrite) {
    return tx.project.create({
      data: { id, ownerId, country, ...data, publishedAt: null },
      select: { id: true },
    });
  }

  /** Sửa có điều kiện: đúng chủ + trạng thái cho phép (luật 7) */
  async update(
    tx: DbTx,
    id: string,
    ownerId: string,
    from: readonly ProjectStatus[],
    data: ProjectWrite,
  ): Promise<boolean> {
    const r = await tx.project.updateMany({
      where: { id, ownerId, deletedAt: null, status: { in: [...from] } },
      // Rời "Đang hiển thị" để duyệt lại → bỏ nổi bật (D-18, Q-G5b-4)
      data: { ...data, ...(data.status === 'published' ? {} : { featuredAt: null }) },
    });
    return r.count === 1;
  }

  /**
   * Áp nội dung bản sửa đã duyệt (REQ-106): không đổi trạng thái / nổi bật; chỉ khi dự án còn
   * Đang hiển thị hoặc Đã ẩn (luật 7)
   */
  async applyContent(tx: DbTx, id: string, data: ProjectContent): Promise<boolean> {
    const r = await tx.project.updateMany({
      where: { id, deletedAt: null, status: { in: ['published', 'hidden'] } },
      data,
    });
    return r.count === 1;
  }

  /** Đội + gọi vốn + nhóm chia sẻ (cùng transaction của service) */
  async writeChildren(
    tx: DbTx,
    id: string,
    p: { team: TeamWrite[]; funding: FundingWrite | null; shares: string[] },
  ): Promise<void> {
    await this.replaceTeam(tx, id, p.team);
    await this.setFunding(tx, id, p.funding);
    await this.replaceShares(tx, id, p.shares);
  }

  async replaceTeam(tx: DbTx, projectId: string, team: readonly TeamWrite[]): Promise<void> {
    await tx.projectMember.deleteMany({ where: { projectId } });
    await tx.projectMember.createMany({
      data: team.map((m, sort) => ({ projectId, sort, ...m })),
    });
  }

  async replaceShares(tx: DbTx, projectId: string, groupIds: readonly string[]): Promise<void> {
    await tx.projectShare.deleteMany({ where: { projectId, groupId: { notIn: [...groupIds] } } });
    if (groupIds.length) {
      await tx.projectShare.createMany({
        data: groupIds.map((groupId) => ({ projectId, groupId })),
        skipDuplicates: true,
      });
    }
  }

  async setFunding(tx: DbTx, projectId: string, f: FundingWrite | null): Promise<void> {
    if (!f) {
      await tx.projectFunding.deleteMany({ where: { projectId } });
      return;
    }
    await tx.projectFunding.upsert({
      where: { projectId },
      create: { projectId, round: 'Seed', instrument: 'Cổ phần', endsAt: new Date(), ...f },
      update: f,
    });
  }

  async isOwner(id: string, userId: string): Promise<{ name: string } | null> {
    return this.prisma.db.project.findFirst({
      where: { id, ownerId: userId, deletedAt: null },
      select: { name: true },
    });
  }
}
