import { Injectable } from '@nestjs/common';
import type {
  StoreDetail,
  StoreFacets,
  StoreList,
  StoreListQuery,
} from '@opchub/shared/api-domains';
import { STORE_PAGE_SIZE } from '@opchub/shared/api-domains';
import { notFound } from '@/common/errors';
import { RedisService } from '@/common/redis/redis.service';
import { toStoreCard, toStoreDetail } from '../domain/store.mapper';
import { NeedExploreRepository } from '../repositories/need-explore.repository';
import { StoreExploreRepository } from '../repositories/store-explore.repository';

const FACET_KEY = 'stores:facets';
const FACET_TTL_SEC = 60;

/** Khám phá + chi tiết (UP-08, §25.2) */
@Injectable()
export class StoreExploreService {
  constructor(
    private readonly repo: StoreExploreRepository,
    private readonly redis: RedisService,
    private readonly needs: NeedExploreRepository,
  ) {}

  async list(q: StoreListQuery, now = new Date()): Promise<StoreList> {
    const [{ rows, total }, facets] = await Promise.all([this.repo.page(q, now), this.facets(now)]);
    // V4-609 badge "Đang tìm đối tác": một truy vấn cho cả trang
    const seeking = await this.needs.seeking(rows.map((r) => r.id));
    const items = rows.map((r) => toStoreCard(r, seeking.has(r.id)));
    return { items, page: q.page, size: STORE_PAGE_SIZE, total, facets };
  }

  /** Blueprint NFR: facet một lượt `GROUP BY`, cache Redis 60 s (xoá khi xuất bản / ẩn) */
  private async facets(now: Date): Promise<StoreFacets> {
    const hit = await this.redis.client.get(FACET_KEY).catch(() => null);
    if (hit) return JSON.parse(hit) as StoreFacets;
    const f = await this.repo.facets(now);
    await this.redis.client
      .set(FACET_KEY, JSON.stringify(f), 'EX', FACET_TTL_SEC)
      .catch(() => null);
    return f;
  }

  async invalidate(): Promise<void> {
    await this.redis.client.del(FACET_KEY).catch(() => null);
  }

  async detail(viewerId: string, id: string, now = new Date()): Promise<StoreDetail> {
    const r = await this.repo.detail(id, viewerId, now);
    if (!r) throw notFound('Không tìm thấy gian hàng');
    return toStoreDetail(r, viewerId, await this.needs.ofStore(r.id));
  }
}
