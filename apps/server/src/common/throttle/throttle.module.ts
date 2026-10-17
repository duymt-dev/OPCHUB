import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ENV, type Env } from '../config';
import { RedisService } from '../redis/redis.service';

/**
 * Rate limit lưu Redis (security.md): API chung 100/phút. Endpoint riêng (login, OTP, quên
 * mật khẩu) dùng `@Throttle({ default: { limit, ttl } })` tại controller.
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [RedisService, ENV],
      useFactory: (redis: RedisService, env: Env) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
        skipIf: () => env.RATE_LIMIT_DISABLED,
        storage: new ThrottlerStorageRedisService(redis.duplicate({ prefix: 'opchub:throttle:' })),
      }),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class ThrottleModule {}
