import { Injectable } from '@nestjs/common';
import { type DashboardLive, dashboardLiveSchema } from '@opchub/shared/api-domains';
import { PresenceService } from '@/common/realtime';
import { RedisService } from '@/common/redis/redis.service';
import {
  toCountries,
  toMembers,
  toMessages,
  toSessions,
  toThreads,
} from './dashboard-blocks.mapper';
import { DashboardBlocksRepository } from './dashboard-blocks.repository';
import { LiveMetricsService, vnMidnight } from './live-metrics.service';

const BLOCKS_KEY = 'dashboard:blocks';
/** Khối nặng (thành viên, quốc gia, tin, thảo luận, phiên) cache 60 giây (S-10) */
const BLOCKS_SEC = 60;
const MEMBER_LIMIT = 60;
const DAY_MS = 86_400_000;

type Blocks = Pick<DashboardLive, 'members' | 'countries' | 'messages' | 'sessions' | 'threads'>;
const blocksSchema = dashboardLiveSchema.pick({
  members: true,
  countries: true,
  messages: true,
  sessions: true,
  threads: true,
});

/**
 * `GET /dashboard/live` (REQ-224, BUG-012, TD-010): toàn bộ từ dữ liệu thật — bộ mô phỏng prototype
 * đã bỏ. Số đếm + hoạt động trực tiếp từ Redis (`LiveMetricsService`, cùng gói đẩy 3 giây); khối
 * danh sách từ DB, cache 60 giây. Khối chưa có dữ liệu → mảng rỗng, FE hiện trạng thái rỗng.
 */
@Injectable()
export class DashboardLiveService {
  constructor(
    private readonly redis: RedisService,
    private readonly presence: PresenceService,
    private readonly metrics: LiveMetricsService,
    private readonly blocks: DashboardBlocksRepository,
  ) {}

  async live(now = new Date()): Promise<DashboardLive> {
    const [m, b] = await Promise.all([this.metrics.metrics(now), this.cachedBlocks(now)]);
    return {
      generatedAt: m.generatedAt,
      communityCount: m.communities,
      countryCount: b.countries.length,
      stats: m.stats,
      activities: m.activities,
      ...b,
    };
  }

  private async cachedBlocks(now: Date): Promise<Blocks> {
    const hit = await this.redis.client.get(BLOCKS_KEY);
    if (hit) {
      const p = blocksSchema.safeParse(JSON.parse(hit));
      if (p.success) return p.data;
    }
    const value = await this.compute(now);
    await this.redis.client.set(BLOCKS_KEY, JSON.stringify(value), 'EX', BLOCKS_SEC);
    return value;
  }

  private async compute(now: Date): Promise<Blocks> {
    const start = vnMidnight(now);
    const [members, countries, recent, threads, sessions] = await Promise.all([
      this.blocks.members(MEMBER_LIMIT),
      this.blocks.countries(),
      this.blocks.recent(6),
      this.blocks.threads(3),
      this.blocks.sessions(start, new Date(start.getTime() + DAY_MS)),
    ]);
    const online = await this.presence.usersOnline(members.map((r) => r.id));
    return {
      members: toMembers(members, online, now),
      countries: toCountries(countries),
      messages: toMessages(recent),
      sessions: toSessions(sessions, now),
      threads: toThreads(threads),
    };
  }
}
