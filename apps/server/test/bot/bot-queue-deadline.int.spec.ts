import { Queue } from 'bullmq';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { BULL_PREFIX } from '@/common/queue';
import { BotCoreModule, BotWorkQueueService } from '@/modules/bot';
import { createTestApp, type TestApp } from '../setup/test-app';
import { replyFixtures } from './reply-fixture';

describe('REQ-207 REQ-208 BullMQ due-time consistency', () => {
  let t: TestApp;
  let fixture: ReturnType<typeof replyFixtures>;
  let queue: Queue;
  const jobs: string[] = [];

  beforeAll(async () => {
    t = await createTestApp({ imports: [BotCoreModule] });
    fixture = replyFixtures(t, new Date());
    await fixture.start();
    queue = new Queue('bot', {
      connection: t.redis.duplicate({ prefix: '' }),
      prefix: BULL_PREFIX,
    });
  });
  afterAll(async () => {
    for (const id of jobs) await (await queue.getJob(id))?.remove();
    await queue.close();
    await fixture.close();
    await t.close();
  });

  it.each([0, 25])(
    'REQ-207 persisted deadline is not advanced by %i ms producer clock drift',
    async (drift) => {
      const room = await fixture.room();
      const source = await fixture.send(room.token, room.roomId);
      await fixture.admit(source.id, new Date());
      const thread = await fixture.threadOf(source.id);
      if (!thread.nextAt) throw new Error('Missing admitted deadline');
      const jobId = `bot-${thread.id}-0`;
      jobs.push(jobId);
      let now = Date.now();
      const clock = vi.spyOn(Date, 'now').mockImplementation(() => {
        now += drift;
        return now;
      });
      try {
        await t.app.get(BotWorkQueueService).turns([{ threadId: thread.id, turn: 0 }]);
      } finally {
        clock.mockRestore();
      }
      const job = await queue.getJob(jobId);
      expect(job).toBeDefined();
      if (!job) throw new Error('Missing actual Redis job');
      expect(job.timestamp + job.delay).toBe(thread.nextAt.getTime());
      expect(job.data).toEqual({ threadId: thread.id, turn: 0 });
      expect(job.opts.attempts).toBe(3);
      const unchanged = await fixture.threadOf(source.id);
      expect(unchanged.nextAt).toEqual(thread.nextAt);
      expect(unchanged.cursor).toBe(0);
    },
  );
});
