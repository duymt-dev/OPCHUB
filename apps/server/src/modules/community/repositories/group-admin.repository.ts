import { Injectable } from '@nestjs/common';
import type { DbTx, GroupJoinMode, Region } from '@opchub/db';
import { Prisma } from '@opchub/db';
import type { UserStatus } from '@opchub/shared';
import { PrismaService } from '@/common/prisma/prisma.service';
import { GROUP_SELECT, type GroupRow, type RoomRow } from '../domain/group.mapper';

export interface GroupWrite {
  name: string;
  province: string;
  region: Region;
  description: string;
  joinMode: GroupJoinMode;
  rules: string[];
  coverUrl: string | null;
}

export interface NewRoom {
  slug: string;
  name: string;
  description: string;
  isDefault: boolean;
}

export interface GroupMemberExportRow {
  group_id: string;
  group_name: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  user_country: string;
  account_type: 'personal' | 'business' | 'investor';
  company: string | null;
  tax_code: string | null;
  biz_country: string | null;
  group_role: 'owner' | 'moderator' | 'member';
  joined_at: Date;
  status: UserStatus;
}

/** Ghi/đọc phía Admin Nhóm (bảng groups, rooms, group_members) */
@Injectable()
export class GroupAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Đọc đủ chi tiết: nhóm + phòng theo thứ tự tạo + owner/moderator — 3 query song song */
  async detail(id: string) {
    const group = await this.prisma.db.group.findFirst({
      where: { id, deletedAt: null },
      select: { ...GROUP_SELECT, rules: true, coverUrl: true },
    });
    if (!group) return null;
    const [rooms, staff] = await Promise.all([
      this.prisma.db.room.findMany({
        where: { groupId: id },
        select: { slug: true, name: true, description: true },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.db.groupMember.findMany({
        where: { groupId: id, status: 'member', groupRole: { in: ['owner', 'moderator'] } },
        select: { userId: true, groupRole: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return { group, rooms: rooms satisfies RoomRow[], staff };
  }

  /** Ảnh bìa đang lưu (undefined = không có nhóm) — so `current` khi kiểm ảnh (NA-26) */
  async coverOf(id: string): Promise<string | null | undefined> {
    const g = await this.prisma.db.group.findFirst({
      where: { id, deletedAt: null },
      select: { coverUrl: true },
    });
    return g ? g.coverUrl : undefined;
  }

  /** Trùng tên / tỉnh với nhóm khác còn sống */
  async clash(name: string, province: string, exceptId: string | null) {
    const rows = await this.prisma.db.group.findMany({
      where: {
        deletedAt: null,
        ...(exceptId ? { id: { not: exceptId } } : {}),
        OR: [{ name: { equals: name, mode: 'insensitive' } }, { province }],
      },
      select: { name: true, province: true },
      take: 2,
    });
    return {
      name: rows.some((r) => r.name.toLowerCase() === name.toLowerCase()),
      province: rows.some((r) => r.province === province),
    };
  }

  create(tx: DbTx, id: string, slug: string, data: GroupWrite): Promise<GroupRow> {
    return tx.group.create({ data: { id, slug, ...data }, select: GROUP_SELECT });
  }

  async update(tx: DbTx, id: string, data: GroupWrite): Promise<boolean> {
    const r = await tx.group.updateMany({ where: { id, deletedAt: null }, data });
    return r.count === 1;
  }

  async softDelete(tx: DbTx, id: string): Promise<string | null> {
    const rows = await tx.$queryRaw<{ name: string }[]>`
      UPDATE groups SET deleted_at = now(), updated_at = now()
      WHERE id = ${id} AND deleted_at IS NULL RETURNING name`;
    return rows[0]?.name ?? null;
  }

  async addRooms(tx: DbTx, groupId: string, createdBy: string, rooms: readonly NewRoom[]) {
    if (!rooms.length) return;
    await tx.room.createMany({
      data: rooms.map((r) => ({ ...r, groupId, createdBy: r.isDefault ? null : createdBy })),
      skipDuplicates: true,
    });
  }

  /**
   * Đặt chủ nhóm + điều phối viên: hạ người cũ về `member`, upsert người mới thành `member`
   * với vai trò; trả số người vừa trở thành thành viên (để cộng `member_count`).
   */
  async setStaff(
    tx: DbTx,
    groupId: string,
    ownerId: string,
    moderatorIds: readonly string[],
  ): Promise<number> {
    const ids = [ownerId, ...moderatorIds];
    await tx.$executeRaw`
      UPDATE group_members SET group_role = 'member', updated_at = now()
      WHERE group_id = ${groupId} AND group_role <> 'member' AND NOT (user_id = ANY(${ids}::text[]))`;
    const rows = await tx.$queryRaw<{ was_member: boolean }[]>`
      WITH want AS (
        SELECT uid, CASE WHEN uid = ${ownerId} THEN 'owner' ELSE 'moderator' END::group_role AS r
        FROM unnest(${ids}::text[]) AS uid
        JOIN users u ON u.id = uid AND u.deleted_at IS NULL
      ), prev AS (
        SELECT user_id, status FROM group_members WHERE group_id = ${groupId} AND user_id = ANY(${ids}::text[])
      )
      INSERT INTO group_members (group_id, user_id, status, group_role, created_at, updated_at)
      SELECT ${groupId}, uid, 'member', r, now(), now() FROM want
      ON CONFLICT (group_id, user_id) DO UPDATE
        SET status = 'member', group_role = EXCLUDED.group_role, updated_at = now()
      RETURNING (SELECT p.status = 'member' FROM prev p WHERE p.user_id = group_members.user_id) AS was_member`;
    return rows.filter((r) => r.was_member !== true).length;
  }

  async bumpMemberCount(tx: DbTx, groupId: string, delta: number): Promise<void> {
    if (!delta) return;
    await tx.$executeRaw`
      UPDATE groups SET member_count = GREATEST(member_count + ${delta}, 0), updated_at = now()
      WHERE id = ${groupId}`;
  }

  async roomSlugs(groupId: string): Promise<Set<string>> {
    const rows = await this.prisma.db.room.findMany({ where: { groupId }, select: { slug: true } });
    return new Set(rows.map((r) => r.slug));
  }

  /**
   * Số dòng xuất được của mỗi nhóm (hộp "Xuất danh sách thành viên", Q-B63-4): đếm thành viên thật
   * (`status = member`) — khác `groups.member_count` (số hiển thị của nhóm, gồm số prototype).
   * Một câu GROUP BY trên idx (group_id, status, group_role) — index-only, không N+1.
   */
  async memberCounts(): Promise<Record<string, number>> {
    const rows = await this.prisma.db.$queryRaw<{ group_id: string; n: bigint }[]>`
      SELECT gm.group_id, count(*) AS n FROM group_members gm
      JOIN groups g ON g.id = gm.group_id AND g.deleted_at IS NULL
      WHERE gm.status = 'member' GROUP BY gm.group_id`;
    return Object.fromEntries(rows.map((r) => [r.group_id, Number(r.n)]));
  }

  /** Một dòng mỗi cặp (nhóm, thành viên) — thứ tự nhóm theo seed, rồi ngày tham gia */
  membersOf(groupIds: readonly string[], status: UserStatus | null) {
    if (!groupIds.length) return Promise.resolve([] as GroupMemberExportRow[]);
    const byStatus = status ? Prisma.sql`AND u.status = ${status}::user_status` : Prisma.empty;
    return this.prisma.db.$queryRaw<GroupMemberExportRow[]>`
      SELECT g.id AS group_id, g.name AS group_name, u.id AS user_id, u.full_name, u.email, u.phone,
             u.country AS user_country, u.account_type, b.company_name AS company, b.tax_code,
             b.country AS biz_country, gm.group_role, gm.created_at AS joined_at, u.status
      FROM group_members gm
      JOIN groups g ON g.id = gm.group_id AND g.deleted_at IS NULL
      JOIN users u ON u.id = gm.user_id AND u.deleted_at IS NULL
      LEFT JOIN business_profiles b ON b.user_id = u.id
      WHERE gm.group_id = ANY(${[...groupIds]}::text[]) AND gm.status = 'member' ${byStatus}
      ORDER BY g.created_at, g.id, gm.created_at, u.id`;
  }

  /** Số dòng sẽ xuất (hộp thoại "Tải xuống N dòng") — cùng điều kiện với membersOf */
  async countMembersOf(groupIds: readonly string[], status: UserStatus | null): Promise<number> {
    if (!groupIds.length) return 0;
    const byStatus = status ? Prisma.sql`AND u.status = ${status}::user_status` : Prisma.empty;
    const r = await this.prisma.db.$queryRaw<{ n: bigint }[]>`
      SELECT count(*)::bigint AS n FROM group_members gm
      JOIN groups g ON g.id = gm.group_id AND g.deleted_at IS NULL
      JOIN users u ON u.id = gm.user_id AND u.deleted_at IS NULL
      WHERE gm.group_id = ANY(${[...groupIds]}::text[]) AND gm.status = 'member' ${byStatus}`;
    return Number(r[0]?.n ?? 0);
  }
}
