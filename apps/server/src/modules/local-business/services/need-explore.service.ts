import { Injectable } from '@nestjs/common';
import {
  NEED_PAGE_SIZE,
  type NeedFacets,
  type NeedList,
  type NeedListQuery,
} from '@opchub/shared/api-domains';
import { RedisService } from '@/common/redis/redis.service';
import { type NeedRow, toNeed } from '../domain/need.mapper';
import { NeedExploreRepository } from '../repositories/need-explore.repository';

const FACET_KEY = 'needs:facets';
const FACET_TTL_SEC = 60;

/** Danh sách Nhu cầu địa phương (UP-09) + gợi ý gian hàng; facet cache Redis 60 s */
@Injectable()
export class NeedExploreService {
  constructor(
    private readonly repo: NeedExploreRepository,
    private readonly redis: RedisService,
  ) {}

  async list(viewerId: string, q: NeedListQuery, now = new Date()): Promise<NeedList> {
    const [{ rows, total }, facets] = await Promise.all([this.repo.page(q, now), this.facets(now)]);
    return {
      items: await this.withSuggestions(rows, viewerId, now),
      page: q.page,
      size: NEED_PAGE_SIZE,
      total,
      facets,
    };
  }

  async withSuggestions(rows: NeedRow[], viewerId: string, now = new Date()) {
    const sug = await this.repo.suggestions(rows, now);
    return rows.map((r) => toNeed(r, viewerId, sug.get(r.id) ?? null));
  }

  private async facets(now: Date): Promise<NeedFacets> {
    const hit = await this.redis.client.get(FACET_KEY).catch(() => null);
    if (hit) return JSON.parse(hit) as NeedFacets;
    const f = await this.repo.facets(now);
    await this.redis.client
      .set(FACET_KEY, JSON.stringify(f), 'EX', FACET_TTL_SEC)
      .catch(() => null);
    return f;
  }

  async invalidate(): Promise<void> {
    await this.redis.client.del(FACET_KEY).catch(() => null);
  }
}
