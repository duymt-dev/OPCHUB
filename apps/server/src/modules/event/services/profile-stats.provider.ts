import { Injectable, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { type ProfileStats, ProfileStatsRegistry } from '../../account';

/** Số sự kiện đã đăng ký cho hồ sơ (idx event_registrations (user_id, status)) */
@Injectable()
export class EventProfileStats implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ProfileStatsRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async statsOf(userId: string): Promise<Partial<ProfileStats>> {
    const events = await this.prisma.db.eventRegistration.count({
      where: { userId, status: { in: ['registered', 'attended'] } },
    });
    return { events };
  }
}
