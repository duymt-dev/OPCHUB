import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { phoneCountries } from '@opchub/shared/fixtures';
import type { ProjectCard, ProjectSaveData } from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { conflict, forbidden, notFound } from '@/common/errors';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ImageRefService, MediaGcService } from '../../uploads';
import { sanitizeDescription } from '../domain/html-sanitize';
import { FundraisingRepository } from '../repositories/fundraising.repository';
import { toFundraising } from './fundraising.service';
import { toProjectCard } from '../domain/project.mapper';
import { OWNER_EDITABLE, ownerSaveStatus } from '../domain/project-status';
import { ProjectRepository } from '../repositories/project.repository';
import {
  type FundingWrite,
  type ProjectContent,
  ProjectWriteRepository,
  type TeamWrite,
} from '../repositories/project-write.repository';

const NOT_FOUND = 'Không tìm thấy dự án';
const countryName = (cc: string | null | undefined) =>
  phoneCountries.find((c) => c.id === cc)?.name ?? 'Việt Nam';

/**
 * Đăng / sửa dự án (D-108, thay D-18/REQ-106/§9 cũ): trạng thái mới theo `ownerSaveStatus` — gửi
 * là hiện ngay (`published`), sửa ghi đè trực tiếp, không còn bản sửa chờ duyệt (Admin hậu kiểm
 * qua `hide`/`republish` ở `project-admin.repository.ts`, không đổi).
 * Ảnh kiểm NGOÀI transaction (luật 9).
 */
@Injectable()
export class ProjectWriteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: ProjectWriteRepository,
    private readonly read: ProjectRepository,
    private readonly images: ImageRefService,
    private readonly gc: MediaGcService,
    private readonly fundraising: FundraisingRepository,
    private readonly outbox: OutboxService,
  ) {}

  /** TIP-V42-711 (D-108): gửi → hiện ngay (`published`), không qua Chờ duyệt; Admin hậu kiểm riêng. */
  async create(userId: string, input: ProjectSaveData): Promise<ProjectCard> {
    const owner = await this.repo.ownerProfile(userId);
    const prepared = await this.prepare(userId, input, null, owner);
    const id = randomUUID();
    await this.prisma.db.$transaction(async (tx) => {
      await this.repo.create(tx, id, userId, countryName(owner.businessProfile?.country), {
        ...prepared.data,
        status: input.submit ? 'published' : 'draft',
        ...(input.submit ? { publishedAt: new Date() } : {}),
      });
      await this.repo.writeChildren(tx, id, prepared);
      // V4-611 (D-85): bước "Đăng Dự án OPC đầu tiên"
      await this.outbox.add(tx, 'onboarding.touched', { userId });
    });
    return this.card(userId, id);
  }

  /**
   * TIP-V42-711 (D-108): sửa dự án `published` ghi đè trực tiếp, không còn qua bản sửa chờ duyệt
   * (`ProjectRevisionService` giữ cho dữ liệu lịch sử cũ, không dùng ở luồng lưu nữa).
   */
  async update(userId: string, id: string, input: ProjectSaveData): Promise<ProjectCard> {
    const cur = await this.read.findOwned(userId, id);
    if (!cur) throw notFound(NOT_FOUND);
    const next = ownerSaveStatus(cur.status, input.submit);
    if (!next) throw conflict('Trạng thái dự án không cho phép sửa');
    const owner = await this.repo.ownerProfile(userId);
    const prepared = await this.prepare(userId, input, cur, owner);
    await this.prisma.db.$transaction(async (tx) => {
      // Luật 7: chỉ ghi khi trạng thái chưa đổi kể từ lúc đọc
      const from = OWNER_EDITABLE.filter((s) => s === cur.status);
      const data = {
        ...prepared.data,
        status: next.status,
        ...(next.status === 'published' && cur.status !== 'published'
          ? { publishedAt: new Date() }
          : {}),
      };
      if (!(await this.repo.update(tx, id, userId, from, data))) {
        throw conflict('Trạng thái dự án không cho phép sửa');
      }
      await this.repo.writeChildren(tx, id, prepared);
      await this.dropReplaced(tx, cur, prepared);
    });
    return this.card(userId, id);
  }

  /** NA-26: bìa / ảnh đội ngũ không còn dùng sau khi lưu → hàng dọn ảnh (cùng transaction) */
  private async dropReplaced(
    tx: DbTx,
    cur: { coverUrl: string | null; members: { avatarUrl: string | null }[] },
    next: { data: { coverUrl: string | null }; team: { avatarUrl: string | null }[] },
  ): Promise<void> {
    await this.gc.enqueueReplaced(tx, cur.coverUrl, next.data.coverUrl, 'project-cover');
    const kept = new Set(next.team.map((m) => m.avatarUrl));
    for (const m of cur.members) {
      if (m.avatarUrl && !kept.has(m.avatarUrl)) {
        await this.gc.enqueueReplaced(tx, m.avatarUrl, null, 'team-avatar');
      }
    }
  }

  private async card(userId: string, id: string): Promise<ProjectCard> {
    const [row] = await this.read.byIds([id]);
    if (!row) throw notFound(NOT_FOUND);
    const [followed, latest] = await Promise.all([
      this.read.followedAmong(userId, [id]),
      this.fundraising.latestAmong([id]),
    ]);
    const f = latest.get(id);
    // V4-610: khoản Gọi vốn gần nhất cho chủ dự án (Portal quyết định mở popup thanh toán)
    return {
      ...toProjectCard(row, followed.has(id), false, row.ownerId),
      fundraising: f ? toFundraising(f) : null,
    };
  }

  private async prepare(
    userId: string,
    input: ProjectSaveData,
    cur: { coverUrl: string | null; members: { avatarUrl: string | null }[] } | null,
    owner: { fullName: string; avatarUrl: string | null },
  ) {
    const [categoryId, shares, home] = await Promise.all([
      this.repo.categoryId(input.category),
      this.repo.memberGroupIds(userId, input.groupIds),
      this.repo.homeGroupId(userId),
    ]);
    // QT-ST-PJ: storeId client gửi phải là gian hàng của chính chủ — không tin client
    if (input.storeId && !(await this.repo.storeOwnedBy(input.storeId, userId))) {
      throw forbidden('Gian hàng không hợp lệ');
    }
    const coverUrl = await this.images.resolve({
      userId,
      kind: 'project-cover',
      url: input.coverUrl,
      current: cur?.coverUrl ?? null,
      path: 'coverUrl',
    });
    const team = await this.team(userId, input, cur, owner);
    const repo = input.repo?.url ? input.repo : null;
    const data: ProjectContent = {
      name: input.name || 'Dự án chưa đặt tên',
      categoryId,
      groupId: shares[0] ?? home,
      summary: input.summary,
      descriptionHtml: sanitizeDescription(input.description),
      stage: input.stage,
      audience: input.audience,
      visibility: input.visibility,
      tags: input.tags,
      website: input.website || null,
      coverUrl,
      testUrl: input.testUrl || null,
      repoProvider: repo?.provider ?? null,
      repoUrl: repo?.url ?? null,
      repoVisibility: repo?.visibility ?? null,
      deckUrl: input.funding?.deckUrl || null,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      contactAddress: input.contactAddress,
      province: input.province,
      storeId: input.storeId,
    };
    const funding: FundingWrite | null = input.funding
      ? {
          amount: BigInt(input.funding.amount),
          currency: input.funding.currency,
          equityPct: input.funding.equityPercent,
          minTicket: BigInt(input.funding.minTicket),
          useOfFunds: input.funding.useOfFunds,
        }
      : null;
    return { data, team, funding, shares };
  }

  /** Đội rỗng → chủ dự án "Founder · CEO"; avatar kiểm như ảnh bìa; khớp tên → user_id */
  private async team(
    userId: string,
    input: ProjectSaveData,
    cur: { members: { avatarUrl: string | null }[] } | null,
    owner: { fullName: string; avatarUrl: string | null },
  ): Promise<TeamWrite[]> {
    const src = input.team.length
      ? input.team
      : [
          {
            name: owner.fullName,
            role: 'Founder · CEO',
            avatarUrl: owner.avatarUrl,
            isOwner: true,
          },
        ];
    const known = new Set([owner.avatarUrl, ...(cur?.members.map((m) => m.avatarUrl) ?? [])]);
    const ids = await this.repo.userIdsByName(src.map((m) => m.name));
    return Promise.all(
      src.map(async (m, i) => ({
        name: m.name,
        role: m.role,
        isOwner: m.isOwner,
        userId: m.isOwner ? userId : (ids.get(m.name) ?? null),
        avatarUrl:
          m.avatarUrl && known.has(m.avatarUrl)
            ? m.avatarUrl
            : await this.images.resolve({
                userId,
                kind: 'team-avatar',
                url: m.avatarUrl,
                path: `team.${i}.avatarUrl`,
              }),
      })),
    );
  }
}
