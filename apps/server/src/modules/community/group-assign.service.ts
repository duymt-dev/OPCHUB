import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { GroupAssignPort } from '../account';

/**
 * Gán thành viên vào nhóm từ Admin (BR-07): id lạ bị bỏ qua (join groups/users), upsert `member`, cập nhật `member_count`
 * trong cùng transaction theo số dòng thật sự chuyển sang `member`.
 */
@Injectable()
export class GroupAssignService implements GroupAssignPort {
  constructor(private readonly prisma: PrismaService) {}

  async assign(tx: DbTx, userIds: readonly string[], groupIds: readonly string[]): Promise<number> {
    const added = await tx.$queryRaw<{ group_id: string; user_id: string }[]>`
      INSERT INTO group_members (group_id, user_id, status, group_role, created_at, updated_at)
      SELECT g.id, u.id, 'member', 'member', now(), now()
      FROM unnest(${[...groupIds]}::text[]) AS gid
      JOIN groups g ON g.id = gid AND g.deleted_at IS NULL
      CROSS JOIN unnest(${[...userIds]}::text[]) AS uid
      JOIN users u ON u.id = uid AND u.deleted_at IS NULL
      ON CONFLICT (group_id, user_id) DO UPDATE SET status = 'member', updated_at = now()
        WHERE group_members.status <> 'member'
      RETURNING group_id, user_id`;
    if (!added.length) return 0;
    await tx.$executeRaw`
      UPDATE groups g SET member_count = g.member_count + c.n, updated_at = now()
      FROM (SELECT gid, count(*)::int AS n FROM unnest(${added.map((a) => a.group_id)}::text[]) gid
            GROUP BY gid) c
      WHERE g.id = c.gid`;
    return new Set(added.map((a) => a.user_id)).size;
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
