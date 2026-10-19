import type { INestApplication, ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';
import { loadEnv } from '@/common/config';
import { RedisIoAdapter } from '@/socket/redis-io.adapter';
import { SocketAppModule } from '@/socket/socket-app.module';

export interface SocketTestApp {
  app: INestApplication;
  url: string;
  connect: (token: string | null) => Socket;
  /** Handshake tuỳ ý (vd `{ token, scope: 'membership' }`) */
  connectWith: (auth: Record<string, string>) => Socket;
  close: () => Promise<void>;
}

/** Dựng process socket thật (Redis db 2, adapter Redis) trên cổng ngẫu nhiên */
export async function createSocketApp(
  extra: { overrides?: [token: unknown, value: unknown][] } & ModuleMetadata = {},
): Promise<SocketTestApp> {
  let builder = Test.createTestingModule({ imports: [SocketAppModule, ...(extra.imports ?? [])] });
  for (const [token, value] of extra.overrides ?? []) {
    builder = builder.overrideProvider(token).useValue(value);
  }
  const app = (await builder.compile()).createNestApplication({ bufferLogs: true });
  app.useWebSocketAdapter(new RedisIoAdapter(app, loadEnv()));
  await app.listen(0);
  const { port } = (app.getHttpServer() as Server).address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;
  const sockets: Socket[] = [];
  const open = (auth: Record<string, string>) => {
    const s = io(url, { transports: ['websocket'], auth, reconnection: false, forceNew: true });
    sockets.push(s);
    return s;
  };
  return {
    app,
    url,
    connect: (token) => open(token ? { token } : {}),
    connectWith: (auth) => open(auth),
    close: async () => {
      for (const s of sockets) s.disconnect();
      await app.close();
    },
  };
}

/** Chờ kết nối xong hoặc lỗi handshake */
export function connected(s: Socket): Promise<{ ok: true } | { ok: false; code: string }> {
  if (s.connected) return Promise.resolve({ ok: true });
  return new Promise((resolve) => {
    s.once('connect', () => resolve({ ok: true }));
    s.once('connect_error', (err: Error & { data?: { code?: string } }) =>
      resolve({ ok: false, code: err.data?.code ?? err.message }),
    );
  });
}

export function nextEvent<T>(s: Socket, event: string, timeoutMs = 3_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Hết giờ chờ ${event}`)), timeoutMs);
    s.once(event, (data: T) => {
      clearTimeout(t);
      resolve(data);
    });
  });
}
