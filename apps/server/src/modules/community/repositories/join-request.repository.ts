import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface PendingRow {
  userId: string;
  intro: string | null;
  createdAt: Date;
  user: { fullName: string; avatarUrl: string | null };
}

/** Yêu cầu vào nhóm = `group_members.status = 'pending'` — idx (group_id, status, group_role) */
@Injectable()
export class JoinRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  pendingOf(groupId: string): Promise<PendingRow[]> {
    return this.prisma.db.groupMember.findMany({
      where: { groupId, status: 'pending', group: { deletedAt: null } },
      select: {
        userId: true,
        intro: true,
        createdAt: true,
        user: { select: { fullName: true, avatarUrl: true } },
      },
      orderBy: [{ createdAt: 'asc' }, { userId: 'asc' }],
      take: 500,
    });
  }

  /** `pending → member|rejected` có điều kiện; trả tên người gửi khi chuyển được */
  async decide(
    tx: DbTx,
    groupId: string,
    userId: string,
    to: 'member' | 'rejected',
    decidedBy: string,
  ): Promise<string | null> {
    const rows = await tx.$queryRaw<{ full_name: string }[]>`
      UPDATE group_members gm SET status = ${to}::group_member_status, decided_by = ${decidedBy},
        decided_at = now(), updated_at = now()
      FROM users u
      WHERE gm.group_id = ${groupId} AND gm.user_id = ${userId} AND gm.status = 'pending'
        AND u.id = gm.user_id
      RETURNING u.full_name`;
    return rows[0]?.full_name ?? null;
  }

  async bumpMemberCount(tx: DbTx, groupId: string): Promise<void> {
    await tx.$executeRaw`
      UPDATE groups SET member_count = member_count + 1, updated_at = now() WHERE id = ${groupId}`;
  }

  /** Tin hệ thống vào phòng mặc định (sender NULL → `senderRole: 'system'`) */
  async systemMessage(tx: DbTx, groupId: string, body: string): Promise<void> {
    await tx.$executeRaw`
      INSERT INTO messages (id, room_id, body, created_at, updated_at)
      SELECT gen_random_uuid()::text, r.id, ${body}, now(), now()
      FROM rooms r WHERE r.group_id = ${groupId} AND r.is_default
      LIMIT 1`;
  }

  /** Chủ nhóm đang là thành viên (nhận `member.request`) */
  async ownersOf(groupId: string): Promise<string[]> {
    const rows = await this.prisma.db.groupMember.findMany({
      where: { groupId, status: 'member', groupRole: 'owner' },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  }
}
