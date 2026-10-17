import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ApiAppModule } from './api/api-app.module';
import { loadEnv } from './common/config';
import { configureHttp } from './common/http/bootstrap-http';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create(ApiAppModule, { bufferLogs: true });
  configureHttp(app, env);
  await app.listen(env.API_PORT);
}

void bootstrap();
