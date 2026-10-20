import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadEnv } from '@/common/config';
import { RedisService } from '@/common/redis/redis.service';

describe('TIP-V2-504 native/test Redis PubSub isolation', () => {
  let demo: RedisService;
  let test: RedisService;
  beforeAll(() => {
    const env = loadEnv();
    demo = new RedisService({ ...env, REDIS_DB: 1 });
    test = new RedisService({ ...env, REDIS_DB: 2 });
  });
  afterAll(async () => {
    await demo.onModuleDestroy();
    await test.onModuleDestroy();
  });

  it.each(['socket:room', 'socket:user', 'opchub:io'])(
    'separates %s packets by DB namespace; a cross-DB positive control proves SELECT is not isolation',
    async (base) => {
      // Pub/Sub only on unique synthetic channels: never mutate native DB 1 keys or join real rooms.
      const topic = `${base}:isolation-${randomUUID()}`;
      const first = demo.duplicate({ prefix: '' });
      const second = test.duplicate({ prefix: '' });
      const received1: string[] = [];
      const received2: string[] = [];
      first.on('message', (_channel, value: string) => {
        received1.push(value);
      });
      second.on('message', (_channel, value: string) => {
        received2.push(value);
      });
      await first.subscribe(demo.channel(topic));
      await second.subscribe(test.channel(topic));
      try {
        await demo.client.publish(demo.channel(topic), 'native-only');
        // Same DB-1 connection publishes to DB-2's channel. Redis routes it globally.
        // This acts as an ordered barrier, not a timing-based negative assertion.
        await demo.client.publish(test.channel(topic), 'cross-db-control');
        await test.client.publish(test.channel(topic), 'test-only');
        await expect.poll(() => received1).toEqual(['native-only']);
        await expect.poll(() => received2).toEqual(['cross-db-control', 'test-only']);
        expect(demo.channel(topic)).not.toBe(test.channel(topic));
      } finally {
        await first.quit();
        await second.quit();
      }
    },
  );
});
