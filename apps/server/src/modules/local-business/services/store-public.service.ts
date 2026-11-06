import { Inject, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  defaultStoreSeo,
  EMPTY_SOCIALS,
  storePublicConfigSchema,
  storePublicPageSchema,
  type StorePublicPatch,
  storePublicSlugSchema,
} from '@opchub/shared/api-domains';
import { ENV, type Env } from '@/common/config';
import { conflict, forbidden, notFound } from '@/common/errors';
import { RedisService } from '@/common/redis/redis.service';
import { BUSINESS_ONLY, HIDDEN_BY_ADMIN, NO_STORE_YET } from '../domain/store-status';
import { StorePublicRepository } from '../repositories/store-public.repository';
import type { StoreOwner } from '../domain/store-owner.types';

const key = (slug: string) => `store-public:${slug}`;

@Injectable()
export class StorePublicService {
  private readonly logger = new Logger(StorePublicService.name);
  constructor(
    private readonly repo: StorePublicRepository,
    private readonly redis: RedisService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async mine(u: StoreOwner) {
    if (u.accountType !== 'business') throw forbidden(BUSINESS_ONLY);
    const r = await this.repo.owner(u.id);
    if (!r?.slug) throw notFound(NO_STORE_YET);
    return storePublicConfigSchema.parse({
      slug: r.slug,
      url: `${this.env.PORTAL_URL.replace(/\/$/, '')}/g/${r.slug}`,
      seoIndex: r.seoIndex,
      title: r.seoTitle,
      desc: r.seoDesc,
      ...defaultStoreSeo(r),
      status: r.status,
    });
  }

  async patch(u: StoreOwner, input: StorePublicPatch) {
    const current = await this.mine(u);
    if (current.status === 'hidden') throw conflict(HIDDEN_BY_ADMIN);
    const updated = await this.repo.patch(u.id, input);
    if (!updated.count) throw conflict(HIDDEN_BY_ADMIN);
    await this.invalidate(current.slug);
    return this.mine(u);
  }

  async page(slug: string, now = new Date()) {
    if (!storePublicSlugSchema.safeParse(slug).success) throw notFound('Không tìm thấy gian hàng');
    const cached = await this.redis.client.get(key(slug)).catch(() => {
      this.logger.warn('Public store cache read failed');
      return null;
    });
    if (cached) {
      try {
        const parsed = storePublicPageSchema.safeParse(JSON.parse(cached));
        if (parsed.success) return parsed.data;
      } catch {
        this.logger.warn('Invalid public store cache');
      }
    }
    const row = await this.repo.page(slug, now);
    if (!row) throw notFound('Không tìm thấy gian hàng');
    const defaults = defaultStoreSeo(row);
    // zod strips all non-whitelisted keys, including any historical team contact fields.
    const data = storePublicPageSchema.parse({
      ...row,
      team: z.array(storePublicPageSchema.shape.team.element).catch([]).parse(row.team),
      certs: z.array(storePublicPageSchema.shape.certs.element).catch([]).parse(row.certs),
      videos: storePublicPageSchema.shape.videos.catch([]).parse(row.videos),
      socials: storePublicPageSchema.shape.socials.catch(EMPTY_SOCIALS).parse(row.socials),
      seo: {
        index: row.seoIndex,
        title: row.seoTitle || defaults.defaultTitle,
        desc: row.seoDesc || defaults.defaultDesc,
      },
    });
    await this.redis.client.set(key(slug), JSON.stringify(data), 'EX', 60).catch(() => {
      this.logger.warn('Public store cache write failed');
    });
    return data;
  }

  async invalidate(slug: string | null) {
    if (slug)
      await this.redis.client.del(key(slug)).catch(() => {
        this.logger.warn('Public store cache invalidation failed');
      });
  }

  async invalidateStores(ids: readonly string[]) {
    if (!ids.length) return;
    const rows = await this.repo.slugs(ids);
    const keys = rows.flatMap((r) => (r.slug ? [key(r.slug)] : []));
    if (keys.length)
      await this.redis.client.del(...keys).catch(() => {
        this.logger.warn('Public store cache invalidation failed');
      });
  }
}
