import { Inject, Injectable } from '@nestjs/common';
import { type PublicSettings, type PublicStats, publicStatsSchema } from '@opchub/shared/api';
import { RedisService } from '@/common/redis/redis.service';
import { AppSettingsService } from '@/modules/settings';
import { GROUP_JOIN_PORT, type GroupJoinPort } from '../ports';
import { RegistrationRepository } from '../repositories/registration.repository';

const STATS_KEY = 'public:stats';
/** D-38: cache 60 giây */
const STATS_TTL_SEC = 60;

@Injectable()
export class PublicInfoService {
  constructor(
    private readonly appSettings: AppSettingsService,
    private readonly redis: RedisService,
    private readonly registrations: RegistrationRepository,
    @Inject(GROUP_JOIN_PORT) private readonly groups: GroupJoinPort,
  ) {}

  async settings(): Promise<PublicSettings> {
    return { registrationOpen: (await this.appSettings.general()).openRegistration };
  }

  async stats(): Promise<PublicStats> {
    const cached = await this.redis.client.get(STATS_KEY);
    if (cached) {
      const hit = publicStatsSchema.safeParse(JSON.parse(cached));
      if (hit.success) return hit.data;
    }
    const [members, communities] = await Promise.all([
      this.registrations.countMembers(),
      this.groups.countActiveGroups(),
    ]);
    const stats = { members, communities };
    await this.redis.client.set(STATS_KEY, JSON.stringify(stats), 'EX', STATS_TTL_SEC);
    return stats;
  }
}
