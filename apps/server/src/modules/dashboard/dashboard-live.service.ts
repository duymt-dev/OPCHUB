import { Injectable } from '@nestjs/common';
import { type DashboardLive, dashboardLiveSchema } from '@opchub/shared/api-domains';
import { dashboardLive } from '@opchub/shared/mock-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PresenceService } from '@/common/realtime/presence.service';
import { RedisService } from '@/common/redis/redis.service';

const CACHE_KEY = 'dashboard:live';
const CACHE_SEC = 10;
const VN_OFFSET_MS = 7 * 3600 * 1000;

/** 0h hôm nay giờ VN, dạng UTC */
function vnMidnight(now: Date): Date {
  const v = new Date(now.getTime() + VN_OFFSET_MS);
  return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()) - VN_OFFSET_MS);
}

/**
 * `GET /dashboard/live` (REQ-120). Số tổng quan lấy thật (nhóm, thành viên, online Redis, tin hôm
 * nay, chỗ sự kiện sắp tới); danh sách hoạt động / quốc gia / phiên / thảo luận vẫn là bộ mô phỏng
 * prototype (Q-G2a-3, Q-B34-1) tới khi bot B45 sinh dữ liệu thật. Cache Redis 10s (S-10).
 */
@Injectable()
export class DashboardLiveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
    private readonly redis: RedisService,
  ) {}

  async live(): Promise<DashboardLive> {
    const hit = await this.redis.client.get(CACHE_KEY);
    if (hit) {
      const parsed = dashboardLiveSchema.safeParse(JSON.parse(hit));
      if (parsed.success) return parsed.data;
    }
    const body = await this.compute(new Date());
    await this.redis.client.set(CACHE_KEY, JSON.stringify(body), 'EX', CACHE_SEC);
    return body;
  }

  private async compute(now: Date): Promise<DashboardLive> {
    const db = this.prisma.db;
    const [communities, members, online, messagesToday, eventJoins] = await Promise.all([
      db.group.count({ where: { deletedAt: null } }),
      db.user.count({ where: { status: 'active', deletedAt: null } }),
      this.presence.onlineCount(),
      db.message.count({ where: { createdAt: { gte: vnMidnight(now) } } }),
      db.event.aggregate({ where: { startsAt: { gte: now } }, _sum: { registeredCount: true } }),
    ]);
    const sim = dashboardLive(now.getTime());
    return {
      ...sim,
      generatedAt: now.toISOString(),
      communityCount: communities,
      stats: {
        ...sim.stats,
        online,
        totalMembers: members,
        messagesToday,
        eventJoins: eventJoins._sum.registeredCount ?? 0,
      },
    };
  }
}
