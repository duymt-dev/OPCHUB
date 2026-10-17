import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { GroupJoinPort } from '../account';

/**
 * Cổng tham gia nhóm cho account (BR-06). Yêu cầu tạo ở trạng thái `pending` — `member_count`
 * chỉ tăng khi chủ nhóm duyệt (B21), nên không đụng `groups` ở đây.
 */
@Injectable()
export class GroupJoinService implements GroupJoinPort {
  constructor(private readonly prisma: PrismaService) {}

  async existingGroupIds(ids: readonly string[]): Promise<string[]> {
    if (!ids.length) return [];
    const rows = await this.prisma.db.group.findMany({
      where: { id: { in: [...ids] }, deletedAt: null },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async requestJoin(tx: DbTx, userId: string, groupIds: readonly string[]): Promise<void> {
    if (!groupIds.length) return;
    await tx.groupMember.createMany({
      data: groupIds.map((groupId) => ({ groupId, userId, status: 'pending' as const })),
      skipDuplicates: true,
    });
  }

  countActiveGroups(): Promise<number> {
    return this.prisma.db.group.count({ where: { deletedAt: null } });
  }
}
