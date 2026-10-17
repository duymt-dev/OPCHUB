import type { INestApplication, ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { ApiAppModule } from '@/api/api-app.module';
import { loadEnv } from '@/common/config';
import { configureHttp } from '@/common/http/bootstrap-http';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

export interface TestApp {
  app: INestApplication;
  baseUrl: string;
  prisma: PrismaService;
  redis: RedisService;
  /** fetch tới `/v1<path>` */
  call: (
    path: string,
    init?: RequestInit & { json?: unknown; token?: string },
  ) => Promise<Response>;
  close: () => Promise<void>;
}

/** Dựng process api thật (DB test + Redis db 2) trên cổng ngẫu nhiên */
export async function createTestApp(
  extra: ModuleMetadata & { overrides?: [token: unknown, value: unknown][] } = {},
): Promise<TestApp> {
  let builder = Test.createTestingModule({
    imports: [ApiAppModule, ...(extra.imports ?? [])],
    controllers: extra.controllers ?? [],
    providers: extra.providers ?? [],
  });
  for (const [token, value] of extra.overrides ?? []) {
    builder = builder.overrideProvider(token).useValue(value);
  }
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication({ bufferLogs: true, rawBody: true });
  configureHttp(app, loadEnv());
  await app.listen(0);
  const server = app.getHttpServer() as Server;
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}/v1`;

  const call: TestApp['call'] = (path, init = {}) => {
    const { json, token, headers, ...rest } = init;
    const h = new Headers(headers);
    if (json !== undefined) h.set('Content-Type', 'application/json');
    if (token) h.set('Authorization', `Bearer ${token}`);
    return fetch(`${baseUrl}${path}`, {
      ...rest,
      headers: h,
      ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
    });
  };

  return {
    app,
    baseUrl,
    prisma: app.get(PrismaService),
    redis: app.get(RedisService),
    call,
    close: () => app.close(),
  };
}
