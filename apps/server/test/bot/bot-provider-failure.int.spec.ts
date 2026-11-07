import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { FakeLlmProvider, IntegrationError } from '@opchub/integrations';
import { LLM } from '@/common/integrations';
import { BotRunnerService } from '@/modules/bot';
import { createTestApp, type TestApp } from '../setup/test-app';
import { generationFixtures } from './generation-fixture';
import { Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { BotCoreModule } from '@/modules/bot';
import { BULL_PREFIX, WorkerFactory } from '@/common/queue';
import { BotProcessor } from '@/worker/processors/bot.processor';

let t: TestApp;
let fixture: ReturnType<typeof generationFixtures>;
let runner: BotRunnerService;
const provider = new FakeLlmProvider();
const generate = vi.spyOn(provider, 'generateTurn');
const now = new Date('2026-10-21T05:00:00Z');
beforeAll(async () => {
  t = await createTestApp({ overrides: [[LLM, provider]] });
  fixture = generationFixtures(t, now);
  await fixture.start();
  runner = t.app.get(BotRunnerService);
});
afterAll(async () => {
  await fixture.close();
  await t.close();
});

it.each([true, false])(
  'REQ-208 REQ-411 provider failure retryable=%s cannot advance or publish; explicit recovery posts once',
  async (retryable) => {
    generate.mockClear();
    const { thread, group } = await fixture.thread();
    const failure = new IntegrationError('fake', 'Controlled provider failure', retryable);
    generate.mockRejectedValueOnce(failure);
    await expect(runner.postTurn(thread.id, 0, now)).rejects.toBe(failure);
    expect(
      await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: thread.id } }),
    ).toMatchObject({
      status: thread.status,
      cursor: 0,
      nextAt: thread.nextAt,
      lines: thread.lines,
    });
    expect(await t.prisma.db.message.count({ where: { roomId: `${group.id}-general` } })).toBe(0);
    expect(
      await t.prisma.db.botTurnDraft.findUniqueOrThrow({
        where: { threadId_turn: { threadId: thread.id, turn: 0 } },
      }),
    ).toMatchObject({ body: null, leaseUntil: now });
    expect(generate).toHaveBeenCalledTimes(1);

    // Explicit retry after the boundary recovers; this does not assert automatic retry of terminal errors.
    expect(await runner.postTurn(thread.id, 0, now)).toBe(true);
    expect(await runner.postTurn(thread.id, 0, now)).toBe(false);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(await t.prisma.db.message.count({ where: { roomId: `${group.id}-general` } })).toBe(1);
    expect(
      await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: thread.id } }),
    ).toMatchObject({ status: 'running', cursor: 1 });
  },
);

it('A5 not configured logs debug', async () => {
  const local = new FakeLlmProvider();
  vi.spyOn(local, 'generateTurn').mockRejectedValue(
    new IntegrationError('runtime', 'Chưa cấu hình AI', false, { reason: 'not_configured' }),
  );
  const app = await createTestApp({
    imports: [BotCoreModule],
    providers: [BotProcessor],
    overrides: [[LLM, local]],
  });
  const rows = generationFixtures(app, new Date());
  await rows.start();
  const queue = new Queue('bot', {
    connection: app.redis.duplicate({ prefix: '' }),
    prefix: BULL_PREFIX,
  });
  const debug = vi.spyOn(Logger.prototype, 'debug');
  const warn = vi.spyOn(Logger.prototype, 'warn');
  const jobId = `A5-${randomUUID()}`;
  try {
    const { thread, group } = await rows.thread();
    const job = await queue.add(
      'postTurn',
      { threadId: thread.id, turn: 0 },
      {
        jobId,
        attempts: 3,
        removeOnFail: false,
      },
    );
    await vi.waitFor(async () => expect(await job.getState()).toBe('failed'));
    const detail = (value: unknown) =>
      typeof value === 'object' && value !== null && 'jobId' in value && value.jobId === jobId;
    expect(debug.mock.calls.filter(([value]) => detail(value))).toHaveLength(1);
    expect(warn.mock.calls.filter(([value]) => detail(value))).toHaveLength(0);
    const failed = await queue.getJob(jobId);
    expect(failed?.attemptsMade).toBe(1);
    expect(failed?.failedReason).toBe('[runtime] Chưa cấu hình AI');
    expect(await app.prisma.db.message.count({ where: { roomId: `${group.id}-general` } })).toBe(0);
    expect(
      (await app.prisma.db.botThread.findUniqueOrThrow({ where: { id: thread.id } })).cursor,
    ).toBe(0);
  } finally {
    await app.app.get(WorkerFactory).onApplicationShutdown();
    await (await queue.getJob(jobId))?.remove();
    await queue.close();
    debug.mockRestore();
    warn.mockRestore();
    await rows.close();
    await app.close();
  }
});
