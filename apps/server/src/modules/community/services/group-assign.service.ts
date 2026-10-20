import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { GroupAssignPort } from '../../account';

/**
 * Gán thành viên vào nhóm từ Admin (BR-07, NA-12, GR-R01): id lạ bị bỏ qua (join groups/users), upsert
 * `member` với vai trò chọn, cập nhật `member_count` cùng transaction theo số dòng thật sự vào nhóm.
 */
@Injectable()
export class GroupAssignService implements GroupAssignPort {
  constructor(private readonly prisma: PrismaService) {}

  async assign(
    tx: DbTx,
    userIds: readonly string[],
    groupIds: readonly string[],
    role: 'member' | 'lecturer',
  ): Promise<{ userId: string; groupId: string }[]> {
    // `was_member` đọc từ ảnh chụp TRƯỚC câu lệnh (CTE) → phân biệt người mới vào với người chỉ đổi vai trò
    const rows = await tx.$queryRaw<{ group_id: string; user_id: string; joined: boolean }[]>`
      WITH prev AS (
        SELECT group_id, user_id FROM group_members
        WHERE status = 'member' AND group_id = ANY(${[...groupIds]}::text[])
          AND user_id = ANY(${[...userIds]}::text[])
      )
      INSERT INTO group_members (group_id, user_id, status, group_role, created_at, updated_at)
      SELECT g.id, u.id, 'member', ${role}::group_role, now(), now()
      FROM unnest(${[...groupIds]}::text[]) AS gid
      JOIN groups g ON g.id = gid AND g.deleted_at IS NULL
      CROSS JOIN unnest(${[...userIds]}::text[]) AS uid
      JOIN users u ON u.id = uid AND u.deleted_at IS NULL
      ON CONFLICT (group_id, user_id) DO UPDATE
        SET status = 'member',
            group_role = CASE WHEN group_members.group_role = 'owner' THEN 'owner'::group_role
                              WHEN group_members.status = 'member' AND group_members.group_role = 'lecturer'
                                THEN 'lecturer'::group_role
                              ELSE EXCLUDED.group_role END,
            updated_at = now()
        WHERE group_members.status <> 'member'
           OR (group_members.group_role = 'member' AND EXCLUDED.group_role <> 'member')
      RETURNING group_id, user_id,
        NOT EXISTS (SELECT 1 FROM prev p
                    WHERE p.group_id = group_members.group_id AND p.user_id = group_members.user_id) AS joined`;
    const added = rows.filter((r) => r.joined);
    if (!added.length) return [];
    await tx.$executeRaw`
      UPDATE groups g SET member_count = g.member_count + c.n, updated_at = now()
      FROM (SELECT gid, count(*)::int AS n FROM unnest(${added.map((a) => a.group_id)}::text[]) gid
            GROUP BY gid) c
      WHERE g.id = c.gid`;
    return added.map((a) => ({ userId: a.user_id, groupId: a.group_id }));
  }

  /** idx group_members (user_id, status) */
  async groupsOf(userIds: readonly string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (!userIds.length) return map;
    const rows = await this.prisma.db.groupMember.findMany({
      where: { userId: { in: [...userIds] }, status: 'member' },
      select: { userId: true, groupId: true },
    });
    for (const r of rows) map.set(r.userId, [...(map.get(r.userId) ?? []), r.groupId]);
    return map;
  }
}
