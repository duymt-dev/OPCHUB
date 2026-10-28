import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BotReplyLimitsService } from '@/modules/bot/replies/bot-reply-limits.service';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('D-112 native Redis rolling reply budget', () => {
  let t: TestApp;
  let limits: BotReplyLimitsService;
  const groups = Array.from({ length: 7 }, () => randomUUID());
  const now = new Date('2026-10-28T12:00:00Z');
  const keys = [...groups.map((group) => `bot:reply-rate:group:${group}`), 'bot:reply-rate:system'];

  beforeAll(async () => {
    t = await createTestApp();
    limits = t.app.get(BotReplyLimitsService);
  });
  beforeEach(async () => {
    await t.redis.client.del(...keys);
  });
  afterAll(async () => {
    await t.redis.client.del(...keys);
    await t.close();
  });

  it('allows exactly twelve concurrent distinct publications in a group', async () => {
    const group = groups[0];
    if (!group) throw new Error('Missing group');
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, (_, i) => limits.reserve(group, `group-${i}`, now)),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(12);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(8);
    expect(await t.redis.client.zcard(`bot:reply-rate:group:${group}`)).toBe(12);
    expect(await t.redis.client.zcard('bot:reply-rate:system')).toBe(12);
  });

  it('enforces sixty system-wide atomically without spending rejected group slots', async () => {
    const results = await Promise.allSettled(
      groups.flatMap((group) =>
        Array.from({ length: 12 }, (_, i) => limits.reserve(group, `${group}-${i}`, now)),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(60);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(24);
    const counts = await Promise.all(
      groups.map((group) => t.redis.client.zcard(`bot:reply-rate:group:${group}`)),
    );
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(60);
    expect(Math.max(...counts)).toBeLessThanOrEqual(12);
  });

  it('replay is idempotent and does not extend the original minute reservation', async () => {
    const group = groups[0];
    if (!group) throw new Error('Missing group');
    await limits.reserve(group, 'same-publication', now);
    await limits.reserve(group, 'same-publication', new Date(now.getTime() + 59_000));
    expect(await t.redis.client.zcard('bot:reply-rate:system')).toBe(1);
    expect(Number(await t.redis.client.zscore('bot:reply-rate:system', 'same-publication'))).toBe(
      now.getTime(),
    );
    await limits.reserve(group, 'next-minute', new Date(now.getTime() + 60_000));
    expect(await t.redis.client.zscore('bot:reply-rate:system', 'same-publication')).toBeNull();
    expect(await t.redis.client.zcard('bot:reply-rate:system')).toBe(1);
  });

  it('rollback releases both counters and a rolling window does not reset at a wall-clock minute', async () => {
    const group = groups[0];
    if (!group) throw new Error('Missing group');
    const at = new Date(now.getTime() + 59_000);
    await Promise.all(
      Array.from({ length: 12 }, (_, i) => limits.reserve(group, `rollback-${i}`, at)),
    );
    await expect(
      limits.reserve(group, 'too-soon', new Date(now.getTime() + 60_000)),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED', retryAfterSec: 60 });
    await limits.release(group, 'rollback-0');
    expect(await t.redis.client.zcard('bot:reply-rate:system')).toBe(11);
    await expect(limits.reserve(group, 'replacement', at)).resolves.toBeUndefined();
  });
});
