import { Inject, Injectable } from '@nestjs/common';
import type { SsoProvider } from '@opchub/integrations';
import { SSO_IDS } from '@opchub/shared/api-domains';
import { type PublicSettings, type PublicStats, publicStatsSchema } from '@opchub/shared/api';
import { SSO } from '@/common/integrations';
import { PresenceService } from '@/common/realtime';
import { RedisService } from '@/common/redis/redis.service';
import { AppSettingsService } from '@/modules/settings';
import { GROUP_JOIN_PORT, type GroupJoinPort } from '../ports';
import { RegistrationRepository } from '../repositories/registration.repository';

const STATS_KEY = 'public:stats';
/** D-38: cache 60 giây */
const STATS_TTL_SEC = 60;
const VN_OFFSET_MS = 7 * 3_600_000;

/** 0h ngày 1 tháng hiện tại theo giờ VN, dạng UTC */
export function vnMonthStart(now: Date): Date {
  const v = new Date(now.getTime() + VN_OFFSET_MS);
  return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), 1) - VN_OFFSET_MS);
}

@Injectable()
export class PublicInfoService {
  constructor(
    private readonly appSettings: AppSettingsService,
    private readonly redis: RedisService,
    private readonly presence: PresenceService,
    private readonly registrations: RegistrationRepository,
    @Inject(GROUP_JOIN_PORT) private readonly groups: GroupJoinPort,
    @Inject(SSO) private readonly sso: SsoProvider,
  ) {}

  async settings(): Promise<PublicSettings> {
    const [general, security] = await Promise.all([
      this.appSettings.general(),
      this.appSettings.security(),
    ]);
    const on = new Set<string>(security.providers.filter((p) => p.enabled).map((p) => p.id));
    return {
      registrationOpen: general.openRegistration,
      // D-64: thứ tự theo SSO_IDS; ẩn nút Admin tắt hoặc provider chưa cấu hình (Facebook/LinkedIn)
      ssoProviders: SSO_IDS.filter((id) => on.has(id) && this.sso.supports(id)),
    };
  }

  async stats(): Promise<PublicStats> {
    const cached = await this.redis.client.get(STATS_KEY);
    if (cached) {
      const hit = publicStatsSchema.safeParse(JSON.parse(cached));
      if (hit.success) return hit.data;
    }
    const now = new Date();
    const yearAgo = new Date(now.getTime() - 365 * 86_400_000);
    const [members, communities, online, counts] = await Promise.all([
      this.registrations.countMembers(),
      this.groups.countActiveGroups(),
      this.presence.onlineCount(),
      this.registrations.publicCounts(vnMonthStart(now), yearAgo),
    ]);
    // BUG-029 / CR-15: số thật cho màn đăng nhập (Portal + Admin), cache 60 giây
    const stats: PublicStats = {
      members,
      communities,
      online,
      newThisMonth: counts.fresh,
      eventsPerYear: counts.events,
    };
    await this.redis.client.set(STATS_KEY, JSON.stringify(stats), 'EX', STATS_TTL_SEC);
    return stats;
  }
}
