import { Injectable, Logger } from '@nestjs/common';
import { storeSitemapPageSchema } from '@opchub/shared/api-domains';
import { RedisService } from '@/common/redis/redis.service';
import { StorePublicRepository } from '../repositories/store-public.repository';

export const STORE_SITEMAP_VERSION = 'store-sitemap:version';
@Injectable()
export class StoreSitemapService {
  private readonly logger = new Logger(StoreSitemapService.name);
  constructor(
    private readonly repo: StorePublicRepository,
    private readonly redis: RedisService,
  ) {}

  async page(cursor?: { at: string; id: string }, now = new Date()) {
    const version = await this.redis.client.get(STORE_SITEMAP_VERSION).catch(() => null);
    const key = `store-sitemap:${version ?? '0'}:${cursor ? Buffer.from(JSON.stringify(cursor)).toString('base64url') : 'first'}`;
    const cached = await this.redis.client.get(key).catch(() => null);
    if (cached) {
      try {
        const parsed = storeSitemapPageSchema.safeParse(JSON.parse(cached));
        if (parsed.success) return parsed.data;
      } catch {
        this.logger.warn('Invalid sitemap cache');
      }
    }
    const rows = await this.repo.sitemap(now, cursor);
    const page = rows.slice(0, 1000),
      last = page.at(-1);
    const result = storeSitemapPageSchema.parse({
      items: page.map((r) => ({ slug: r.slug, updatedAt: r.updatedAt.toISOString() })),
      nextCursor:
        rows.length > 1000 && last
          ? Buffer.from(JSON.stringify({ at: last.at, id: last.id })).toString('base64url')
          : null,
    });
    await this.redis.client.set(key, JSON.stringify(result), 'EX', 600).catch(() => {
      this.logger.warn('Sitemap cache write failed');
    });
    return result;
  }

  /** Version invalidation avoids a Redis SCAN / per-page deletes. Old pages expire in ten minutes. */
  invalidate() {
    return this.redis.client.incr(STORE_SITEMAP_VERSION);
  }
}
