import { Global, Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { AuthCoreModule } from './auth/auth.module';
import { ConfigModule } from './config';
import { SecretBox } from './crypto/secret-box';
import { IdempotencyService } from './idempotency/idempotency.service';
import { IntegrationsModule } from './integrations/integrations.module';
import { LoggerModule } from './logger/logger.module';
import { OutboxModule } from './outbox/outbox.module';
import { QueueModule } from './queue/queue.module';
import { PresenceService } from './realtime/presence.service';
import { RoomEventsPublisher } from './realtime/room-events.publisher';
import { UserEventsPublisher } from './realtime/user-events.publisher';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

/** Hạ tầng dùng chung cho cả 3 process: env, log, Postgres, Redis, outbox, audit, adapter ngoài */
@Global()
@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    OutboxModule,
    AuditModule,
    AuthCoreModule,
    IntegrationsModule,
    QueueModule,
  ],
  providers: [
    PrismaService,
    RedisService,
    SecretBox,
    UserEventsPublisher,
    PresenceService,
    RoomEventsPublisher,
    IdempotencyService,
  ],
  exports: [
    ConfigModule,
    PrismaService,
    RedisService,
    SecretBox,
    UserEventsPublisher,
    PresenceService,
    RoomEventsPublisher,
    IdempotencyService,
  ],
})
export class CoreModule {}
