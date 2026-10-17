import { Injectable, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { type ProfileStats, ProfileStatsRegistry } from '../../account';

/** Số dự án người dùng làm chủ cho hồ sơ (idx projects (owner_id, updated_at)) */
@Injectable()
export class ProjectProfileStats implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ProfileStatsRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async statsOf(userId: string): Promise<Partial<ProfileStats>> {
    const projects = await this.prisma.db.project.count({
      where: { ownerId: userId, deletedAt: null },
    });
    return { projects };
  }
}
