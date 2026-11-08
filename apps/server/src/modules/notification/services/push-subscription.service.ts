import { Inject, Injectable } from '@nestjs/common';
import {
  pushPreferencesSchema,
  type PushPreferences,
  type PushRealm,
  type PushSubscribe,
} from '@opchub/shared/api-domains';
import { ENV, type Env } from '@/common/config';
import { conflict, forbidden, AppError } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AppSettingsService } from '@/modules/settings';
import { PushSubscriptionRepository } from '../repositories/push-subscription.repository';

@Injectable()
export class PushSubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: PushSubscriptionRepository,
    private readonly settings: AppSettingsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  configured() {
    return Boolean(
      this.env.VAPID_PUBLIC_KEY &&
      (this.env.PUSH_PROVIDER === 'fake' || (this.env.VAPID_PRIVATE_KEY && this.env.VAPID_SUBJECT)),
    );
  }

  async config() {
    const app = await this.settings.app();
    return {
      enabled: app.pwa && this.configured(),
      vapidPublicKey: this.env.VAPID_PUBLIC_KEY ?? '',
      kinds: app.push,
    };
  }

  async subscribe(realm: PushRealm, userId: string, input: PushSubscribe) {
    if (!(await this.config()).enabled) throw conflict('Ứng dụng & thông báo đang tắt');
    if (this.env.NODE_ENV === 'production' && !input.endpoint.startsWith('https://')) {
      const message = 'Địa chỉ đẩy phải dùng HTTPS';
      throw new AppError('VALIDATION_ERROR', message, [{ path: 'endpoint', message }]);
    }
    try {
      await this.prisma.db.$transaction((tx) => this.repo.upsert(tx, realm, userId, input));
    } catch {
      throw new Error('Không thể lưu đăng ký thông báo');
    }
    return { ok: true as const };
  }

  async remove(realm: PushRealm, userId: string, endpoint: string) {
    try {
      await this.repo.remove(realm, userId, endpoint);
    } catch {
      throw new Error('Không thể xóa đăng ký thông báo');
    }
    return { ok: true as const };
  }

  async preferences(realm: PushRealm, userId: string): Promise<PushPreferences> {
    if (realm !== 'member') throw forbidden();
    const row = await this.repo.preferences(realm, userId);
    return row ? pushPreferencesSchema.parse(row.kinds) : (await this.settings.app()).push;
  }

  async savePreferences(realm: PushRealm, userId: string, kinds: PushPreferences) {
    if (realm !== 'member') throw forbidden();
    await this.repo.savePreferences(realm, userId, kinds);
    return kinds;
  }
}
