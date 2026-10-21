import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Queue, Worker } from 'bullmq';
import { BULL_PREFIX } from '@/common/queue';
import { removePendingBefore } from '@/common/queue/pending-cleanup';
import { createTestApp, type TestApp } from '../setup/test-app';
import { signal } from './generation-fixture';

describe('REQ-141 bounded native BullMQ pending cleanup', () => {
  let t: TestApp;
  let queue: Queue;
  let cutoff: number;
  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(() => {
    queue = new Queue(`bot-stop-test-${randomUUID()}`, {
      connection: t.redis.duplicate({ prefix: '' }),
      prefix: BULL_PREFIX,
    });
    cutoff = Date.now();
  });
  afterEach(async () => {
    // Only the random queue created by this test, never the native acceptance queue.
    await queue.obliterate({ force: true });
    await queue.close();
    await t.redis.client.del(
      `queue:cleanup:${queue.name}`,
      `queue:cleanup:${queue.name}:was-paused`,
    );
  });
  afterAll(async () => {
    await t.close();
  });
  const cleanup = () => removePendingBefore(queue, t.redis.client, ['reply', 'postTurn'], cutoff);

  it('REQ-141 pages across >200 waiting/delayed/prioritized jobs without offset skips, preserving publication/tick/new work', async () => {
    await queue.addBulk(
      Array.from({ length: 315 }, (_, i) => ({
        name: i % 2 ? 'postTurn' : 'reply',
        data: {},
        opts: {
          jobId: `old-${i}`,
          timestamp: cutoff - 1,
          ...(i % 3 === 0 ? { delay: 600000 } : i % 3 === 1 ? { priority: 1 } : {}),
        },
      })),
    );
    await queue.addBulk(
      ['publishTurn', 'tick', 'reply'].map((name) => ({
        name,
        data: {},
        opts: { jobId: `retained-${name}`, timestamp: name === 'reply' ? cutoff + 1 : cutoff - 1 },
      })),
    );
    expect(await cleanup()).toBe(315);
    expect(await queue.isPaused()).toBe(false);
    const remaining = await queue.getJobs(['waiting', 'delayed', 'prioritized']);
    expect(remaining.map((job) => job.id).sort()).toEqual([
      'retained-publishTurn',
      'retained-reply',
      'retained-tick',
    ]);
    expect(await cleanup()).toBe(0);
  });

  it('REQ-141 retains a deliberately paused queue state while removing its old waiting jobs', async () => {
    await queue.pause();
    await queue.add('postTurn', {}, { timestamp: cutoff - 1 });
    expect(await cleanup()).toBe(1);
    expect(await queue.isPaused()).toBe(true);
  });

  it('REQ-141 replay recovers a crash after pause and restores the originally running queue', async () => {
    await t.redis.client.set(`queue:cleanup:${queue.name}:was-paused`, '0');
    await queue.pause();
    await queue.add('reply', {}, { timestamp: cutoff - 1 });
    expect(await cleanup()).toBe(1);
    expect(await queue.isPaused()).toBe(false);
  });

  it('REQ-141 concurrent cleanup cannot steal the lease or resume another consumer queue', async () => {
    await queue.pause();
    await t.redis.client.set(`queue:cleanup:${queue.name}`, 'another-consumer', 'PX', 30000);
    await expect(cleanup()).rejects.toThrow('already running');
    expect(await queue.isPaused()).toBe(true);
    expect(await t.redis.client.get(`queue:cleanup:${queue.name}`)).toBe('another-consumer');
  });

  it('REQ-141 never force-removes an active job; database stop fences its late publication', async () => {
    const started = signal<void>();
    const release = signal<void>();
    const worker = new Worker(
      queue.name,
      async () => {
        started.resolve();
        await release.promise;
      },
      { connection: t.redis.duplicate({ prefix: '', blocking: true }), prefix: BULL_PREFIX },
    );
    const job = await queue.add('postTurn', {}, { timestamp: cutoff - 1 });
    try {
      await started.promise;
      expect(await job.getState()).toBe('active');
      expect(await cleanup()).toBe(0);
      expect(await job.getState()).toBe('active');
    } finally {
      release.resolve();
      await worker.close();
    }
  });
});
