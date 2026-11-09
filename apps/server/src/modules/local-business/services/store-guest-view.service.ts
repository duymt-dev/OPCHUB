import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { AccessTokenService } from '@/common/auth';
import { ENV, type Env } from '@/common/config';
import { RedisService } from '@/common/redis/redis.service';
import { StorePublicRepository } from '../repositories/store-public.repository';
import { StoreGuestViewRepository } from '../repositories/store-guest-view.repository';

const BOT = /googlebot|bingbot|facebookexternalhit|zalo|crawler|spider|bot|headless/i;
@Injectable()
export class StoreGuestViewService {
  private readonly logger = new Logger(StoreGuestViewService.name);
  constructor(
    private readonly stores: StorePublicRepository,
    private readonly views: StoreGuestViewRepository,
    private readonly redis: RedisService,
    private readonly tokens: AccessTokenService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async record(slug: string, ip: string, ua: string, authorization?: string, now = new Date()) {
    if (!ua || !ip || BOT.test(ua)) return;
    const store = await this.stores.guestTarget(slug, now);
    if (!store) return;
    if (authorization?.startsWith('Bearer ')) {
      const claims = await this.tokens.verify(authorization.slice(7)).catch(() => null);
      if (claims?.realm === 'member' && claims.sub === store.ownerId) return;
    }
    const digest = createHmac('sha256', this.env.JWT_SECRET)
      .update(JSON.stringify(['store-guest-view', ip, ua, slug]))
      .digest('hex');
    const key = `store-guest-view:${digest}`;
    const claimed = await this.redis.client.set(key, '1', 'EX', 1800, 'NX').catch(() => {
      this.logger.warn('Guest view deduplication unavailable; view ignored');
      return null;
    });
    if (claimed) await this.views.record(store.id, now);
  }
}
