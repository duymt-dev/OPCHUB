import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { GroupJoinPort } from '../../account';

/**
 * Cổng tham gia nhóm lúc đăng ký (BR-06, NA-18, D-71): mọi nhóm đã chọn vào ngay (`member`, cộng
 * `member_count`) + outbox `group.joined`. Một câu INSERT … SELECT cho mọi nhóm, không lặp theo nhóm.
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
    const rows = await tx.$queryRaw<{ group_id: string }[]>`
      INSERT INTO group_members (group_id, user_id, status, group_role, created_at, updated_at)
      SELECT g.id, ${userId}, 'member', 'member', now(), now()
      FROM groups g WHERE g.id = ANY(${[...groupIds]}::text[]) AND g.deleted_at IS NULL
      ON CONFLICT (group_id, user_id) DO NOTHING
      RETURNING group_id`;
    const joined = rows.map((r) => r.group_id);
    if (!joined.length) return;
    await tx.$executeRaw`
      UPDATE groups SET member_count = member_count + 1, updated_at = now()
      WHERE id = ANY(${joined}::text[])`;
    await this.outbox.addMany(
      tx,
      'group.joined',
      joined.map((groupId) => ({ groupId, userId })),
    );
  }

  countActiveGroups(): Promise<number> {
    return this.prisma.db.group.count({ where: { deletedAt: null } });
  }
}
