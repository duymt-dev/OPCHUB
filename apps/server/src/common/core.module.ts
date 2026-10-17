import { Global, Module } from '@nestjs/common';
import { ConfigModule } from './config';
import { LoggerModule } from './logger/logger.module';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

/** Hạ tầng dùng chung cho cả 3 process: env, log, Postgres, Redis */
@Global()
@Module({
  imports: [ConfigModule, LoggerModule],
  providers: [PrismaService, RedisService],
  exports: [ConfigModule, PrismaService, RedisService],
})
export class CoreModule {}
