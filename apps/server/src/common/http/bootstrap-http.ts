import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import type { Env } from '../config';
import { HttpExceptionFilter } from '../filters/http-exception.filter';
import { FORM_LIMIT, JSON_LIMIT } from './body-limits';
import { keepBodyParserErrorType } from './body-parser-errors';

/** Cấu hình HTTP chung cho process api (security.md: helmet, CORS theo env, cookie refresh) */
export function configureHttp(app: INestApplication, env: Env): void {
  const express = app as NestExpressApplication;
  express.useLogger(app.get(Logger));
  express.set('trust proxy', env.TRUST_PROXY);
  express.disable('x-powered-by');
  // TD-015: đăng ký trước init → Nest bỏ parser mặc định 100kb; giữ rawBody (webhook ngân hàng)
  express.useBodyParser('json', { limit: JSON_LIMIT });
  express.useBodyParser('urlencoded', { limit: FORM_LIMIT, extended: true });
  app.use(keepBodyParserErrorType);
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
