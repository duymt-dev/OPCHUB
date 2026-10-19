import { Injectable } from '@nestjs/common';
import type { GroupMemberStatus } from '@opchub/db';
import type { GroupItem, JoinResult } from '@opchub/shared/api-domains';
import { conflict, notFound } from '@/common/errors';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { LiveCountersService } from '@/common/realtime';
import { ConsentWriter } from '../../account';
import { toGroupItem } from '../domain/group.mapper';
import { regionFromLabel } from '../domain/region';
import { GroupRepository } from '../repositories/group.repository';

/** Portal: danh sách nhóm + tham gia/rời (REQ-044, BR-06) */
@Injectable()
export class GroupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groups: GroupRepository,
    private readonly outbox: OutboxService,
    private readonly consents: ConsentWriter,
    private readonly live: LiveCountersService,
  ) {}

  async page(
    userId: string | null,
    q: { region?: string | undefined; q?: string | undefined; page: number; size: number },
  ): Promise<{ items: GroupItem[]; page: number; size: number; total: number }> {
    const region = q.region ? regionFromLabel(q.region) : undefined;
    const { rows, total } = await this.groups.page({ region, q: q.q }, q.page, q.size);
    const ids = rows.map((r) => r.id);
    const [mine, avatars] = await Promise.all([
      userId ? this.groups.statusesOf(userId, ids) : new Map<string, GroupMemberStatus>(),
      this.groups.avatarsOf(ids),
    ]);
    return {
      items: rows.map((g) => toGroupItem(g, mine.get(g.id) ?? null, avatars.get(g.id))),
      page: q.page,
      size: q.size,
      total,
    };
  }

  async join(userId: string, groupId: string, intro: string | undefined): Promise<JoinResult> {
    const group = await this.groups.findLive(groupId);
    if (!group) throw notFound('Không tìm thấy nhóm');
    const text = intro?.trim() ?? '';
    if (group.joinMode === 'approval' && !text) {
      throw conflict('Nhóm này cần lời giới thiệu để duyệt');
    }
    const status = group.joinMode === 'approval' ? 'pending' : 'member';
    await this.prisma.db.$transaction(async (tx) => {
      const cur = await this.groups.lockMember(tx, groupId, userId);
      if (cur?.status === 'member' || cur?.status === 'pending') {
        throw conflict('Bạn đã tham gia hoặc đang chờ duyệt');
      }
      await this.groups.upsertMember(tx, groupId, userId, status, text || null);
      // NR-R02: ô đồng ý nội quy + chính sách phí (body `agreeRules: true`) → lưu vết REQ-013
      await this.consents.feePolicy(tx, userId);
      if (status === 'member') await this.groups.bumpMemberCount(tx, groupId, 1);
      else await this.outbox.add(tx, 'group.join_requested', { groupId, userId, intro: text });
    });
    if (status === 'member') await this.recordJoin(userId, group.name);
    return { groupId, status };
  }

  async leave(userId: string, groupId: string): Promise<JoinResult> {
    return this.prisma.db.$transaction(async (tx) => {
      const cur = await this.groups.lockMember(tx, groupId, userId);
      if (cur?.status !== 'member' && cur?.status !== 'pending') {
        throw notFound('Bạn chưa tham gia nhóm');
      }
      if (cur.status === 'member' && cur.group_role === 'owner') {
        throw conflict('Chủ nhóm không thể rời nhóm');
      }
      const to = cur.status === 'pending' ? 'cancelled' : 'left';
      if (!(await this.groups.transition(tx, groupId, userId, cur.status, to))) {
        throw conflict('Trạng thái đã thay đổi, vui lòng thử lại');
      }
      if (to === 'left') await this.groups.bumpMemberCount(tx, groupId, -1);
      return { groupId, status: to };
    });
  }

  /** NA-24: mục "tham gia nhóm" ở hoạt động trực tiếp Dashboard (lỗi Redis không ảnh hưởng) */
  private async recordJoin(userId: string, groupName: string): Promise<void> {
    const u = await this.prisma.db.user.findUnique({
      where: { id: userId },
      select: { fullName: true, avatarUrl: true },
    });
    if (!u) return;
    await this.live
      .record(
        'join',
        { name: u.fullName, avatarUrl: u.avatarUrl },
        groupName,
        `${userId}:${Date.now()}`,
      )
      .catch(() => undefined);
  }
}
