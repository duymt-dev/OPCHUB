import { Injectable, Logger } from '@nestjs/common';
import { selectNeedMatches } from '@opchub/shared';
import { needMatchesSchema, type NeedMatches } from '@opchub/shared/api-domains';
import { RedisService } from '@/common/redis/redis.service';
import { NeedMatchRepository } from '../repositories/need-match.query';

@Injectable()
export class NeedMatchService {
  private readonly logger = new Logger(NeedMatchService.name);
  constructor(
    private readonly repo: NeedMatchRepository,
    private readonly redis: RedisService,
  ) {}

  async matches(user: { id: string; accountType: string }, now = new Date()): Promise<NeedMatches> {
    const empty = { hasStore: false, storeField: null, rows: [] };
    if (user.accountType !== 'business') return empty;
    const key = `need-matches:${user.id}`;
    try {
      const cached = await this.redis.client.get(key);
      if (cached) {
        const parsed = needMatchesSchema.safeParse(JSON.parse(cached) as unknown);
        if (parsed.success) return parsed.data;
      }
    } catch {
      this.logger.warn('Need matches cache unavailable; calculating directly');
    }
    const store = await this.repo.store(user.id);
    const result: NeedMatches = !store
      ? empty
      : {
          hasStore: true,
          storeField: store.field || null,
          rows:
            store.status === 'hidden' || (!store.field && !store.province)
              ? []
              : selectNeedMatches(store, await this.repo.candidates(user.id, store, now)),
        };
    try {
      await this.redis.client.set(key, JSON.stringify(result), 'EX', 60);
    } catch {
      this.logger.warn('Need matches cache write failed');
    }
    return result;
  }
}
