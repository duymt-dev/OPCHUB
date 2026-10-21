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
  group_role: 'owner' | 'lecturer' | 'member';
  joined_at: Date;
  status: UserStatus;
}

/** Ghi/đọc phía Admin Nhóm (bảng groups, rooms, group_members) */
@Injectable()
export class GroupAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Đọc đủ chi tiết: nhóm + phòng theo thứ tự tạo + chủ nhóm/giảng viên — 3 query song song */
  async detail(id: string) {
    const group = await this.prisma.db.group.findFirst({
      where: { id, deletedAt: null },
      select: { ...GROUP_SELECT, rules: true },
    });
    if (!group) return null;
    const [rooms, staff] = await Promise.all([
      this.prisma.db.room.findMany({
        where: { groupId: id },
        select: { slug: true, name: true, description: true },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.db.groupMember.findMany({
        where: { groupId: id, status: 'member', groupRole: { in: ['owner', 'lecturer'] } },
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

  /** Thêm phòng; trả id phòng thật sự tạo mới (NA-09 phát `room.created`) */
  async addRooms(
    tx: DbTx,
    groupId: string,
    createdBy: string,
    rooms: readonly NewRoom[],
  ): Promise<string[]> {
    if (!rooms.length) return [];
    const made = await tx.room.createManyAndReturn({
      data: rooms.map((r) => ({ ...r, groupId, createdBy: r.isDefault ? null : createdBy })),
      skipDuplicates: true,
      select: { id: true },
    });
    return made.map((r) => r.id);
  }

  /**
   * NA-29 / GR-R02: đặt chủ nhóm + giảng viên theo form. Chủ cũ (không còn trong form) về `member`;
   * giảng viên giữ vai trò (vai trò lưu theo cặp nhóm–thành viên, gán từ màn Thành viên cũng được).
   * Upsert người trong form với vai trò mới; trả số người vừa trở thành thành viên (cộng
   * `member_count`) và chủ nhóm mới nếu đổi (để báo "Bạn là chủ nhóm").
   */
  async setStaff(
    tx: DbTx,
    groupId: string,
    requestedOwnerId: string | undefined,
    lecturerIds: readonly string[],
    defaultOwnerId: string,
  ): Promise<{ added: number; newOwner: boolean; ownerId: string }> {
    const prevOwner = await tx.$queryRaw<{ user_id: string }[]>`
      SELECT user_id FROM group_members
      WHERE group_id = ${groupId} AND group_role = 'owner' AND status = 'member'`;
    const ownerId = requestedOwnerId ?? prevOwner[0]?.user_id ?? defaultOwnerId;
    const ids = [...new Set([ownerId, ...lecturerIds])];
    await tx.$executeRaw`
      UPDATE group_members SET group_role = 'member', updated_at = now()
      WHERE group_id = ${groupId} AND group_role = 'owner' AND user_id <> ${ownerId}`;
    const rows = await tx.$queryRaw<{ was_member: boolean }[]>`
      WITH want AS (
        SELECT uid, CASE WHEN uid = ${ownerId} THEN 'owner' ELSE 'lecturer' END::group_role AS r
        FROM unnest(${ids}::text[]) AS uid
        JOIN users u ON u.id = uid
        -- D-52: TK quản trị giữ dòng users xoá mềm cùng id (chủ nhóm mặc định = Admin tạo nhóm)
        WHERE u.deleted_at IS NULL
           OR EXISTS (SELECT 1 FROM admin_users a WHERE a.id = uid AND a.deleted_at IS NULL)
      ), prev AS (
        SELECT user_id, status FROM group_members WHERE group_id = ${groupId} AND user_id = ANY(${ids}::text[])
      )
      INSERT INTO group_members (group_id, user_id, status, group_role, created_at, updated_at)
      SELECT ${groupId}, uid, 'member', r, now(), now() FROM want
      ON CONFLICT (group_id, user_id) DO UPDATE
        SET status = 'member', group_role = EXCLUDED.group_role, updated_at = now()
      RETURNING (SELECT p.status = 'member' FROM prev p WHERE p.user_id = group_members.user_id) AS was_member`;
    return {
      ownerId,
      added: rows.filter((r) => r.was_member !== true).length,
      newOwner: !prevOwner.some((p) => p.user_id === ownerId),
    };
  }

  async bumpMemberCount(tx: DbTx, groupId: string, delta: number): Promise<void> {
    if (!delta) return;
    await tx.$executeRaw`
      UPDATE groups SET member_count = GREATEST(member_count + ${delta}, 0), updated_at = now()
      WHERE id = ${groupId}`;
  }

  /** Super Admin đang hoạt động tạo sớm nhất (V2Q-60) — nhận nhóm của TK bị khoá */
  async oldestSuperAdmin(tx: DbTx): Promise<string | null> {
    // D-52: Super Admin ở `admin_users`; cần dòng `users` cùng id (FK group_members — dòng đã
    // chuyển được giữ xoá mềm, migration 20261019100000)
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT a.id FROM admin_users a
      JOIN admin_roles r ON r.id = a.role_id AND r.key = 'super_admin'
      WHERE a.status = 'active' AND a.deleted_at IS NULL
        AND EXISTS (SELECT 1 FROM users u WHERE u.id = a.id)
      ORDER BY a.created_at, a.id LIMIT 1`;
    return rows[0]?.id ?? null;
  }

  /**
   * D-15, D-55: hạ chủ nhóm là TK bị khoá về `member` (giữ tư cách thành viên) — có điều kiện
   * `group_role = 'owner'`; upsert `adminId` làm `owner`; cộng `member_count` một câu cho các nhóm
   * Admin mới vào. Chỉ TK còn `locked` (replay sự kiện cũ sau khi đã mở khoá → không làm gì).
   * Trả nhóm đã chuyển (chạy lại → rỗng, idempotent).
   */
  async transferOwnedTo(
    tx: DbTx,
    userIds: readonly string[],
    adminId: string,
  ): Promise<{ groupId: string; name: string; fromUserId: string }[]> {
    const demoted = await tx.$queryRaw<{ group_id: string; user_id: string; name: string }[]>`
      UPDATE group_members gm SET group_role = 'member', updated_at = now()
      FROM groups g, users u
      WHERE g.id = gm.group_id AND g.deleted_at IS NULL AND u.id = gm.user_id AND u.status = 'locked'
        AND gm.user_id = ANY(${[...userIds]}::text[]) AND gm.group_role = 'owner'
      RETURNING gm.group_id, gm.user_id, g.name`;
    if (!demoted.length) return [];
    const groupIds = [...new Set(demoted.map((d) => d.group_id))];
    const rows = await tx.$queryRaw<{ group_id: string; was_member: boolean | null }[]>`
      WITH prev AS (
        SELECT group_id, status FROM group_members
        WHERE user_id = ${adminId} AND group_id = ANY(${groupIds}::text[])
      )
      INSERT INTO group_members (group_id, user_id, status, group_role, created_at, updated_at)
      SELECT gid, ${adminId}, 'member', 'owner', now(), now() FROM unnest(${groupIds}::text[]) AS gid
      ON CONFLICT (group_id, user_id) DO UPDATE
        SET status = 'member', group_role = 'owner', updated_at = now()
      RETURNING group_id,
        (SELECT p.status = 'member' FROM prev p WHERE p.group_id = group_members.group_id) AS was_member`;
    const joined = rows.filter((r) => r.was_member !== true).map((r) => r.group_id);
    if (joined.length) {
      await tx.$executeRaw`
        UPDATE groups SET member_count = member_count + 1, updated_at = now()
        WHERE id = ANY(${joined}::text[])`;
    }
    return demoted.map((d) => ({ groupId: d.group_id, name: d.name, fromUserId: d.user_id }));
  }

  /** Slug + tên (chữ thường) phòng đã có — chống trùng khi Admin thêm chủ đề (NA-09) */
  async roomKeys(groupId: string): Promise<{ slugs: Set<string>; names: Set<string> }> {
    const rows = await this.prisma.db.room.findMany({
      where: { groupId },
      select: { slug: true, name: true },
    });
    return {
      slugs: new Set(rows.map((r) => r.slug)),
      names: new Set(rows.map((r) => r.name.toLocaleLowerCase('vi'))),
    };
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
