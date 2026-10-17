import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { loadEnv } from './common/config';
import { WorkerAppModule } from './worker/worker-app.module';

async function bootstrap(): Promise<void> {
  loadEnv();
  const app = await NestFactory.createApplicationContext(WorkerAppModule);
  app.enableShutdownHooks();
}

void bootstrap();
