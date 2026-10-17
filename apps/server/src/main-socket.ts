import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { loadEnv } from './common/config';
import { RedisIoAdapter } from './socket/redis-io.adapter';
import { SocketAppModule } from './socket/socket-app.module';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create(SocketAppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.useWebSocketAdapter(new RedisIoAdapter(app, env));
  app.enableShutdownHooks();
  await app.listen(env.SOCKET_PORT);
}

void bootstrap();
