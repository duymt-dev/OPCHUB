import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ApiAppModule } from './api/api-app.module';
import { loadEnv } from './common/config';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create(ApiAppModule);
  app.setGlobalPrefix('v1');
  app.enableShutdownHooks();
  await app.listen(env.API_PORT);
}

void bootstrap();
