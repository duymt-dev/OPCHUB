import { Injectable, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { type ProfileStats, ProfileStatsRegistry } from '../account';

/** Số nhóm đã là thành viên cho hồ sơ (idx group_members (user_id, status)) */
@Injectable()
export class CommunityProfileStats implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ProfileStatsRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async statsOf(userId: string): Promise<Partial<ProfileStats>> {
    const groups = await this.prisma.db.groupMember.count({ where: { userId, status: 'member' } });
    return { groups };
  }
}
