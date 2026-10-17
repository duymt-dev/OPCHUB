import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import type { Env } from '../config';
import { HttpExceptionFilter } from '../filters/http-exception.filter';

/** Cấu hình HTTP chung cho process api (security.md: helmet, CORS theo env, cookie refresh) */
export function configureHttp(app: INestApplication, env: Env): void {
  const express = app as NestExpressApplication;
  express.useLogger(app.get(Logger));
  express.set('trust proxy', env.TRUST_PROXY);
  express.disable('x-powered-by');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: env.CORS_ORIGINS,
    credentials: true,
    exposedHeaders: ['X-Request-Id', 'Retry-After'],
  });
  app.setGlobalPrefix('v1');
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
}
