import { Queue } from 'bullmq';
import { LocalLlmProvider } from '@opchub/integrations';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LLM } from '@/common/integrations';
import { BULL_PREFIX, WorkerFactory } from '@/common/queue';
import { BotCoreModule } from '@/modules/bot';
import { BotProcessor } from '@/worker/processors/bot.processor';
import { llmBarrierStub } from '../helpers/llm-barrier-stub';
import { createTestApp, type TestApp } from '../setup/test-app';
import { generationFixtures } from './generation-fixture';

describe('D-112 actual cross-group worker concurrency', () => {
  let t: TestApp;
  let stub: Awaited<ReturnType<typeof llmBarrierStub>>;
  let fixture: ReturnType<typeof generationFixtures>;
  let queue: Queue;
  const jobs: string[] = [];
  beforeAll(async () => {
    stub = await llmBarrierStub();
    t = await createTestApp({
      imports: [BotCoreModule],
      providers: [BotProcessor],
      overrides: [
        [
          LLM,
          new LocalLlmProvider({
            baseUrl: stub.url,
            model: 'parallel-test',
            apiKey: 'test-only-key',
          }),
        ],
      ],
    });
    fixture = generationFixtures(t, new Date());
    await fixture.start();
    queue = new Queue('bot', {
      connection: t.redis.duplicate({ prefix: '' }),
      prefix: BULL_PREFIX,
    });
  });
  afterAll(async () => {
    stub.release();
    await t.app.get(WorkerFactory).onApplicationShutdown();
    for (const id of jobs) await (await queue.getJob(id))?.remove();
    await queue.close();
    await fixture.close();
    await t.close();
    await stub.close();
  });

  it('two groups reach the real HTTP provider before either response is released; duplicate cursors publish once', async () => {
    const a = await fixture.thread();
    const b = await fixture.thread();
    const ids = [a.thread.id, b.thread.id];
    jobs.push(...ids.map((id) => `bot-${id}-0`), `duplicate-${a.thread.id}`);
    await queue.addBulk(
      ids.map((threadId) => ({
        name: 'postTurn',
        data: { threadId, turn: 0 },
        opts: { jobId: `bot-${threadId}-0`, removeOnComplete: true, attempts: 1 },
      })),
    );
    try {
      await expect.poll(() => stub.requests.length, { timeout: 10_000 }).toBe(2);
      expect(await t.prisma.db.message.count({ where: { botThreadId: { in: ids } } })).toBe(0);
      await queue.add(
        'postTurn',
        { threadId: a.thread.id, turn: 0 },
        { jobId: `duplicate-${a.thread.id}`, removeOnComplete: true, attempts: 1 },
      );
      await expect.poll(() => queue.getJob(jobs[2]!), { timeout: 5000 }).toBeUndefined();
      expect(stub.requests).toHaveLength(2);
    } finally {
      stub.release();
    }
    await expect
      .poll(() => t.prisma.db.message.count({ where: { botThreadId: { in: ids } } }), {
        timeout: 10_000,
      })
      .toBe(2);
    const messages = await t.prisma.db.message.findMany({
      where: { botThreadId: { in: ids } },
      select: { botThreadId: true, body: true, isSimulated: true },
    });
    expect(messages).toEqual(
      expect.arrayContaining(
        ids.map((botThreadId) => ({
          botThreadId,
          body: 'Parallel real HTTP response',
          isSimulated: true,
        })),
      ),
    );
    expect(
      await t.prisma.db.botThread.count({
        where: { id: { in: ids }, cursor: 1, status: 'running' },
      }),
    ).toBe(2);
    process.stdout.write(
      'D-112: 2 concurrent HTTP requests held at barrier; 2 actual messages; duplicate cursor fenced.\n',
    );
  });
});
