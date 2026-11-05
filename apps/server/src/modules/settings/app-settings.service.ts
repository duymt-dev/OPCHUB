import { Injectable } from '@nestjs/common';
import {
  type GeneralSettings,
  generalSettingsSchema,
  type WelcomeMail,
  welcomeMailSchema,
  renewalSettingsSchema,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

/** Phần `security` mà luồng đăng ký/đăng nhập cần (userCount tính ở màn Admin) */
const securityCoreSchema = z.object({
  minPasswordLength: z.number().int().min(6),
  sessionDays: z.number().int(),
  lockoutEnabled: z.boolean(),
  /** SEC-R02: TK quản trị chưa có 2FA phải thiết lập ở lần đăng nhập kế tiếp */
  requireAdmin2fa: z.boolean().default(false),
  providers: z.array(z.object({ id: z.string(), enabled: z.boolean() })),
});
export type SecurityCore = z.infer<typeof securityCoreSchema>;

export type SettingKey = 'general' | 'security' | 'languages' | 'welcome_mail' | 'bot' | 'renewal';

const CACHE_TTL_SEC = 60;
const cacheKey = (k: SettingKey) => `settings:${k}`;

/**
 * Đọc `app_settings` (S-03: không query DB mỗi request — cache Redis 60 giây).
 * Admin ghi (B40) gọi `invalidate` sau commit.
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

  renewal() {
    return this.read('renewal', renewalSettingsSchema);
  }

  async invalidate(key: SettingKey): Promise<void> {
    await this.redis.client.del(cacheKey(key));
  }

  /** Đọc thô (Admin Cài đặt) — vẫn qua cache + parse schema của caller */
  get<T>(key: SettingKey, schema: z.ZodType<T>): Promise<T> {
    return this.read(key, schema);
  }

  private async read<T>(key: SettingKey, schema: z.ZodType<T>): Promise<T> {
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
