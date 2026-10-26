import { Injectable } from '@nestjs/common';
import type { DbTx, GroupMemberStatus, Region } from '@opchub/db';
import { Prisma } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';
import { GROUP_SELECT, type GroupRow } from '../domain/group.mapper';

export interface GroupFilter {
  /** undefined = không lọc; null = miền không tồn tại (kết quả rỗng) */
  region?: Region | null | undefined;
  q?: string | undefined;
}

const LIVE = { deletedAt: null } as const;

/** Thứ tự ổn định = thứ tự seed (c1…c34) rồi nhóm tạo sau */
const ORDER: Prisma.GroupOrderByWithRelationInput[] = [{ createdAt: 'asc' }, { id: 'asc' }];

/** Bảng `groups` + trạng thái của người gọi trong `group_members` */
@Injectable()
export class GroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  private where(f: GroupFilter): Prisma.GroupWhereInput | null {
    if (f.region === null) return null;
    return {
      ...LIVE,
      ...(f.region ? { region: f.region } : {}),
      // Prisma `contains` tự escape ký tự đại diện
      ...(f.q
        ? {
            OR: [
              { name: { contains: f.q, mode: 'insensitive' } },
              { province: { contains: f.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  /** 34 nhóm (D-29) — bảng nhỏ, offset an toàn; trạng thái của caller lấy 1 query theo id trang */
  async page(
    f: GroupFilter,
    page: number,
    size: number,
  ): Promise<{ rows: GroupRow[]; total: number }> {
    const where = this.where(f);
    if (!where) return { rows: [], total: 0 };
    const [rows, total] = await Promise.all([
      this.prisma.db.group.findMany({
        where,
        select: GROUP_SELECT,
        orderBy: ORDER,
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.db.group.count({ where }),
    ]);
    return { rows, total };
  }

  /** PK (group_id, user_id) */
  async statusesOf(userId: string, groupIds: readonly string[]) {
    const map = new Map<string, GroupMemberStatus>();
    if (!groupIds.length) return map;
    const rows = await this.prisma.db.groupMember.findMany({
      where: { userId, groupId: { in: [...groupIds] } },
      select: { groupId: true, status: true },
    });
    for (const r of rows) map.set(r.groupId, r.status);
    return map;
  }

  /**
   * BUG-011: ≤ 4 ảnh đại diện của thành viên `member` mới nhất mỗi nhóm — MỘT query cho cả trang
   * (LATERAL theo danh sách id, seek `group_members(group_id, status, …)`); bỏ TK chưa có ảnh/khoá.
   */
  async avatarsOf(groupIds: readonly string[]): Promise<Map<string, string[]>> {
    const out = new Map<string, string[]>();
    if (!groupIds.length) return out;
    const rows = await this.prisma.db.$queryRaw<
      { group_id: string; avatar_url: string }[]
    >(Prisma.sql`
      SELECT g.id AS group_id, a.avatar_url
      FROM unnest(${[...groupIds]}::text[]) AS g(id)
      CROSS JOIN LATERAL (
        SELECT u.avatar_url
        FROM group_members gm
        JOIN users u ON u.id = gm.user_id
        WHERE gm.group_id = g.id AND gm.status = 'member'
          AND u.avatar_url IS NOT NULL AND u.status = 'active' AND u.deleted_at IS NULL
        ORDER BY gm.created_at DESC, gm.user_id
        LIMIT 4
      ) a`);
    for (const r of rows) out.set(r.group_id, [...(out.get(r.group_id) ?? []), r.avatar_url]);
    return out;
  }

  findLive(id: string): Promise<GroupRow | null> {
    return this.prisma.db.group.findFirst({ where: { id, ...LIVE }, select: GROUP_SELECT });
  }

  /** Khoá dòng thành viên để chuyển trạng thái tuần tự */
  async lockMember(tx: DbTx, groupId: string, userId: string) {
    const rows = await tx.$queryRaw<{ status: GroupMemberStatus; group_role: string }[]>`
      SELECT status, group_role FROM group_members
      WHERE group_id = ${groupId} AND user_id = ${userId} FOR UPDATE`;
    return rows[0] ?? null;
  }

  /** Ghi (lại) thành viên; hàng cũ (left|removed) được dùng lại (D-71: vào ngay) */
  async upsertMember(
    tx: DbTx,
    groupId: string,
    userId: string,
    intro: string | null,
  ): Promise<void> {
    await tx.groupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      create: { groupId, userId, status: 'member', intro },
      update: { status: 'member', intro, groupRole: 'member', decidedBy: null, decidedAt: null },
    });
  }

  /** Transition có điều kiện `WHERE status = from` (luật 7) */
  async transition(
    tx: DbTx,
    groupId: string,
    userId: string,
    from: GroupMemberStatus,
    to: GroupMemberStatus,
  ): Promise<boolean> {
    const r = await tx.groupMember.updateMany({
      where: { groupId, userId, status: from },
      data: { status: to },
    });
    return r.count === 1;
  }

  async bumpMemberCount(tx: DbTx, groupId: string, delta: number): Promise<void> {
    await tx.$executeRaw`
      UPDATE groups SET member_count = GREATEST(member_count + ${delta}, 0), updated_at = now()
      WHERE id = ${groupId}`;
  }
}
