import { Injectable } from '@nestjs/common';
import type { GroupRolePort, GroupRoleValue } from '@/common/auth/group-role.port';
import { PrismaService } from '@/common/prisma/prisma.service';

/** Hiện thực `GROUP_ROLE_PORT` (D-43): vai trò khi đang là thành viên — PK (group_id, user_id) */
@Injectable()
export class GroupRoleService implements GroupRolePort {
  constructor(private readonly prisma: PrismaService) {}

  async roleOf(groupId: string, userId: string): Promise<GroupRoleValue | null> {
    const m = await this.prisma.db.groupMember.findFirst({
      where: { groupId, userId, status: 'member', group: { deletedAt: null } },
      select: { groupRole: true },
    });
    return m?.groupRole ?? null;
  }
}
