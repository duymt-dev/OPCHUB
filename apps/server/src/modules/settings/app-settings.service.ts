import { Injectable } from '@nestjs/common';
import {
  type GeneralSettings,
  generalSettingsSchema,
  type WelcomeMail,
  welcomeMailSchema,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

/** Phần `security` mà luồng đăng ký/đăng nhập cần (providers tính ở B54) */
const securityCoreSchema = z.object({
  minPasswordLength: z.number().int().min(6),
  sessionDays: z.number().int(),
  lockoutEnabled: z.boolean(),
  providers: z.array(z.object({ id: z.string(), enabled: z.boolean() })),
});
export type SecurityCore = z.infer<typeof securityCoreSchema>;

type Key = 'general' | 'security' | 'welcome_mail';

const CACHE_TTL_SEC = 60;
const cacheKey = (k: Key) => `settings:${k}`;

/**
 * Đọc `app_settings` (S-03: không query DB mỗi request — cache Redis 60 giây).
 * Admin ghi (B54) gọi `invalidate` sau commit.
 */
@Injectable()
export class AppSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  general(): Promise<GeneralSettings> {
    return this.read('general', generalSettingsSchema);
  }

  security(): Promise<SecurityCore> {
    return this.read('security', securityCoreSchema);
  }

  welcomeMail(): Promise<WelcomeMail> {
    return this.read('welcome_mail', welcomeMailSchema);
  }

  async invalidate(key: Key): Promise<void> {
    await this.redis.client.del(cacheKey(key));
  }

  private async read<T>(key: Key, schema: z.ZodType<T>): Promise<T> {
    const cached = await this.redis.client.get(cacheKey(key));
    if (cached) {
      const hit = schema.safeParse(JSON.parse(cached));
      if (hit.success) return hit.data;
    }
    const row = await this.prisma.db.appSetting.findUnique({
      where: { key },
      select: { value: true },
    });
    if (!row) throw new Error(`Thiếu app_settings.${key} — chạy seed bắt buộc`);
    const value = schema.parse(row.value);
    await this.redis.client.set(cacheKey(key), JSON.stringify(value), 'EX', CACHE_TTL_SEC);
    return value;
  }
}
