import { Injectable } from '@nestjs/common';
import { type DashboardLive, dashboardLiveSchema } from '@opchub/shared/api-domains';
import { PresenceService } from '@/common/realtime';
import { DashboardContentCacheService } from './dashboard-content-cache.service';
import { DashboardThreadsService } from './dashboard-threads.service';
import { toCountries, toMembers, toMessages, toSessions } from './dashboard-blocks.mapper';
import { DashboardBlocksRepository } from './dashboard-blocks.repository';
import { LiveMetricsService, vnMidnight } from './live-metrics.service';

/** Khối nặng cache60s (S-10); hội thoại có cache10s riêng theo TIP-V2-502. */
const BLOCKS_SEC = 60;
const MEMBER_LIMIT = 60;
const DAY_MS = 86_400_000;

type Blocks = Pick<DashboardLive, 'members' | 'countries' | 'messages' | 'sessions'>;
const blocksSchema = dashboardLiveSchema.pick({
  members: true,
  countries: true,
  messages: true,
  sessions: true,
});

/**
 * `GET /dashboard/live` (REQ-224, BUG-012, TD-010): toàn bộ từ dữ liệu thật — bộ mô phỏng prototype
 * đã bỏ. Số đếm + hoạt động trực tiếp từ Redis (`LiveMetricsService`, cùng gói đẩy 3 giây); khối
 * danh sách từ DB, cache 60 giây. Khối chưa có dữ liệu → mảng rỗng, FE hiện trạng thái rỗng.
 */
@Injectable()
export class DashboardLiveService {
  constructor(
    private readonly cache: DashboardContentCacheService,
    private readonly presence: PresenceService,
    private readonly metrics: LiveMetricsService,
    private readonly blocks: DashboardBlocksRepository,
    private readonly threads: DashboardThreadsService,
  ) {}

  async live(now = new Date()): Promise<DashboardLive> {
    const [m, b] = await Promise.all([this.metrics.metrics(now), this.cachedBlocks(now)]);
    // Sample short-lived discussions last: slow heavy blocks must not return an
    // already-expired/pre-publication thread snapshot or consume its cache window.
    const threads = await this.threads.list();
    return {
      generatedAt: m.generatedAt,
      communityCount: m.communities,
      countryCount: b.countries.length,
      stats: m.stats,
      activities: m.activities,
      ...b,
      threads,
    };
  }

  private async cachedBlocks(now: Date): Promise<Blocks> {
    return this.cache.remember('blocks', BLOCKS_SEC, blocksSchema, () => this.compute(now));
  }

  private async compute(now: Date): Promise<Blocks> {
    const start = vnMidnight(now);
    const [members, countries, recent, sessions] = await Promise.all([
      this.blocks.members(MEMBER_LIMIT),
      this.blocks.countries(),
      this.blocks.recent(6),
      this.blocks.sessions(start, new Date(start.getTime() + DAY_MS)),
    ]);
    const online = await this.presence.usersOnline(members.map((r) => r.id));
    return {
      members: toMembers(members, online, now),
      countries: toCountries(countries),
      messages: toMessages(recent),
      sessions: toSessions(sessions, now),
    };
  }
}
