import { Global, Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { AuthCoreModule } from './auth/auth.module';
import { ConfigModule } from './config';
import { LoggerModule } from './logger/logger.module';
import { OutboxModule } from './outbox/outbox.module';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

/** Hạ tầng dùng chung cho cả 3 process: env, log, Postgres, Redis, outbox, audit */
@Global()
@Module({
  imports: [ConfigModule, LoggerModule, OutboxModule, AuditModule, AuthCoreModule],
  providers: [PrismaService, RedisService],
  exports: [ConfigModule, PrismaService, RedisService],
})
export class CoreModule {}
