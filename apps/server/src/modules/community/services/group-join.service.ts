import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { GroupJoinPort } from '../../account';

/**
 * Cổng tham gia nhóm lúc đăng ký (BR-06, NA-18): nhóm `open` vào ngay (`member`, cộng `member_count`),
 * nhóm `approval` ở `pending` + outbox `group.join_requested` (chủ nhóm duyệt trên panel). Một câu
 * INSERT … SELECT theo `join_mode` cho mọi nhóm, không lặp theo nhóm.
 */
@Injectable()
export class GroupJoinService implements GroupJoinPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

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
    const rows = await tx.$queryRaw<{ group_id: string; status: 'member' | 'pending' }[]>`
      INSERT INTO group_members (group_id, user_id, status, group_role, created_at, updated_at)
      SELECT g.id, ${userId},
             CASE WHEN g.join_mode = 'open' THEN 'member' ELSE 'pending' END::group_member_status,
             'member', now(), now()
      FROM groups g WHERE g.id = ANY(${[...groupIds]}::text[]) AND g.deleted_at IS NULL
      ON CONFLICT (group_id, user_id) DO NOTHING
      RETURNING group_id, status`;
    const joined = rows.filter((r) => r.status === 'member').map((r) => r.group_id);
    if (joined.length) {
      await tx.$executeRaw`
        UPDATE groups SET member_count = member_count + 1, updated_at = now()
        WHERE id = ANY(${joined}::text[])`;
    }
    const pending = rows.filter((r) => r.status === 'pending');
    await this.outbox.addMany(
      tx,
      'group.join_requested',
      pending.map((r) => ({ groupId: r.group_id, userId, intro: '' })),
    );
  }

  countActiveGroups(): Promise<number> {
    return this.prisma.db.group.count({ where: { deletedAt: null } });
  }
}
