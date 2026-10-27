import { Injectable } from '@nestjs/common';
import {
  type AdminPriceConfig,
  type PriceConfig,
  type PriceConfigSave,
  priceConfigSchema,
} from '@opchub/shared';
import { AuditService } from '@/common/audit';
import { conflict } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { PriceConfigRepository, type PriceRow } from './price-config.repository';

const KEY = 'pricing:config';
const EPOCH = 'pricing:epoch';
const TTL_SEC = 300;
/** Chỉ ghi cache khi epoch chưa đổi — người đọc trước lúc Admin lưu không ghi đè giá cũ (S-03) */
const putIfCurrent = `if (redis.call('GET', KEYS[1]) or '0') ~= ARGV[1] then return 0 end
  redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3]); return 1`;
const bump = `redis.call('INCR', KEYS[1]); redis.call('DEL', KEYS[2]); return 1`;

export interface PriceActor {
  id: string;
  ip: string | null;
}

const plain = (r: PriceRow): PriceConfig => ({ per: r.per, biz: r.biz, fund: r.fund });
const adminView = (r: PriceRow): AdminPriceConfig => ({
  ...plain(r),
  version: r.version,
  updatedAt: r.updatedAt.toISOString(),
});

/**
 * D-94 5A (V-12): giá đọc từ `price_configs` qua cache Redis; Admin lưu → giá + lịch sử + audit +
 * cập nhật khoản chưa thu trong một transaction, xoá cache sau commit (áp dụng ngay, không deploy).
 */
@Injectable()
export class PriceConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly repo: PriceConfigRepository,
    private readonly audit: AuditService,
  ) {}

  /** Giá hiện hành cho mọi domain (đăng ký, kích hoạt, Gọi vốn, Affiliate, Portal) */
  async current(): Promise<PriceConfig> {
    const epoch = (await this.redis.client.get(EPOCH)) ?? '0';
    const raw = await this.redis.client.get(KEY);
    if (raw) {
      const hit = priceConfigSchema.safeParse(this.json(raw));
      if (hit.success) return hit.data;
    }
    const value = plain(await this.repo.get());
    await this.redis.client.eval(
      putIfCurrent,
      2,
      EPOCH,
      KEY,
      epoch,
      JSON.stringify(value),
      TTL_SEC,
    );
    return value;
  }

  async admin(): Promise<AdminPriceConfig> {
    return adminView(await this.repo.get());
  }

  async save(actor: PriceActor, body: PriceConfigSave): Promise<AdminPriceConfig> {
    const next: PriceConfig = { per: body.per, biz: body.biz, fund: body.fund };
    const saved = await this.prisma.db.$transaction(async (tx) => {
      const before = await this.repo.lock(tx);
      if (before.version !== body.version) {
        throw conflict('Bảng giá vừa được người khác cập nhật — tải lại để xem giá mới');
      }
      const after = await this.repo.save(tx, next, before.version + 1, actor.id);
      const repriced = await this.repo.repriceFees(tx, next);
      await this.audit.log(tx, {
        actorId: actor.id,
        ip: actor.ip,
        action: 'pricing.update',
        entity: 'price_config',
        entityId: '1',
        tag: 'pricing',
        summary: 'Cập nhật bảng giá',
        diff: { before: plain(before), after: next, version: after.version, repriced },
      });
      return after;
    });
    await this.redis.client.eval(bump, 2, EPOCH, KEY);
    return adminView(saved);
  }

  private json(raw: string): unknown {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
}
