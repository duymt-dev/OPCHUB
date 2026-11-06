import { randomUUID } from 'node:crypto';
import { Queue } from 'bullmq';
import { FakeLlmProvider } from '@opchub/integrations';
import { LLM } from '@/common/integrations';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { botSettingsSchema } from '@opchub/shared/api-domains';
import { OutboxRelayService } from '@/common/outbox';
import { BULL_PREFIX, WorkerFactory } from '@/common/queue';
import { BotCoreModule, BotRunnerService, BotSchedulerService } from '@/modules/bot';
import { BotProcessor } from '@/worker/processors/bot.processor';
import { createGroup } from '../factories/group.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('REQ-208 BUG-008 real bot worker pause/resume', () => {
  let t: TestApp;
  let queue: Queue;
  let original: ReturnType<typeof botSettingsSchema.parse>;
  const id = randomUUID();
  const scriptId = randomUUID();
  const personaId = randomUUID();
  let groupId: string;
  let originallyEnabled: string[] = [];
  const extraJobs: string[] = [];
  const jobId = `bot-${id}-0`;

  beforeAll(async () => {
    t = await createTestApp({
      imports: [BotCoreModule],
      providers: [BotProcessor],
      overrides: [[LLM, new FakeLlmProvider()]],
    });
    queue = new Queue('bot', {
      connection: t.redis.duplicate({ prefix: '' }),
      prefix: BULL_PREFIX,
    });
    original = botSettingsSchema.parse(
      (await t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'bot' } })).value,
    );
    originallyEnabled = (
      await t.prisma.db.botScript.findMany({ where: { enabled: true }, select: { id: true } })
    ).map((row) => row.id);
    await t.prisma.db.botScript.updateMany({ data: { enabled: false } });
    await setting(false);
    groupId = (await createGroup(t)).id;
    await t.prisma.db.persona.create({
      data: {
        id: personaId,
        name: 'Worker persona',
        groupIds: [groupId],
        activeHours: '00:00 - 24:00',
        postsPerDay: 20,
      },
    });
    const lines = [{ personaId, body: 'A real worker turn without approval' }];
    await t.prisma.db.botScript.create({
      data: { id: scriptId, topic: 'Worker pause resume', groupIds: [groupId], lines },
    });
    await t.prisma.db.botThread.create({
      data: {
        id,
        scriptId,
        topic: 'Worker pause resume',
        groupIds: [groupId],
        lines,
        personaQueue: [personaId],
        nextAt: new Date(),
      },
    });
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    await t.app.get(WorkerFactory).onApplicationShutdown();
    await (await queue.getJob(jobId))?.remove();
    for (const extra of extraJobs) await (await queue.getJob(extra))?.remove();
    await queue.close();
    await t.prisma.db.outboxEvent.deleteMany({
      where: {
        type: 'bot.turn_due',
        OR: [id, ...extraJobs.map((job) => job.slice(4, -2))].map((threadId) => ({
          payload: { path: ['threadId'], equals: threadId },
        })),
      },
    });
    await t.prisma.db.botScript.deleteMany({ where: { id: scriptId } });
    await t.prisma.db.botScript.updateMany({
      where: { id: { in: originallyEnabled } },
      data: { enabled: true },
    });
    await t.prisma.db.group.deleteMany({ where: { id: groupId } });
    await t.prisma.db.persona.deleteMany({ where: { id: personaId } });
    await t.prisma.db.appSetting.update({ where: { key: 'bot' }, data: { value: original } });
    await t.close();
  });

  async function setting(enabled: boolean) {
    await t.prisma.db.appSetting.update({
      where: { key: 'bot' },
      data: { value: { ...original, enabled, autoGenerate: false } },
    });
  }

  it('REQ-208 canonical all-day form choice posts exactly once through the native runner', async () => {
    const threadId = randomUUID();
    const previous = botSettingsSchema.parse(
      (await t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'bot' } })).value,
    );
    try {
      await setting(true);
      await t.prisma.db.persona.update({
        where: { id: personaId },
        data: { activeHours: 'Cả ngày' },
      });
      await t.prisma.db.botThread.create({
        data: {
          id: threadId,
          scriptId,
          topic: 'Canonical all-day',
          groupIds: [groupId],
          lines: [{ personaId, body: 'All-day publication' }],
          personaQueue: [personaId],
          nextAt: new Date(),
        },
      });
      const runner = t.app.get(BotRunnerService);
      await runner.postTurn(threadId, 0);
      await runner.postTurn(threadId, 0);
      expect(
        await t.prisma.db.message.findMany({
          where: { botThreadId: threadId },
          select: { body: true, personaId: true, isSimulated: true },
        }),
      ).toEqual([{ body: 'All-day publication', personaId, isSimulated: true }]);
      expect(
        await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: threadId } }),
      ).toMatchObject({
        status: 'done',
        cursor: 1,
        nextAt: null,
      });
    } finally {
      await t.prisma.db.message.deleteMany({ where: { botThreadId: threadId } });
      await t.prisma.db.botThread.deleteMany({ where: { id: threadId } });
      await t.prisma.db.persona.update({
        where: { id: personaId },
        data: { activeHours: '00:00 - 24:00' },
      });
      await t.prisma.db.appSetting.update({ where: { key: 'bot' }, data: { value: previous } });
    }
  });

  it('REQ-208 actual outbox job consumed while paused does not strand the stable cursor on resume', async () => {
    const runner = vi.spyOn(t.app.get(BotRunnerService), 'postTurn');
    await t.prisma.db.outboxEvent.create({
      data: {
        type: 'bot.turn_due',
        payload: { threadId: id, turn: 0, at: new Date().toISOString() },
      },
    });
    await t.app.get(OutboxRelayService).relayOnce();
    await expect
      .poll(() => runner.mock.calls.some(([threadId]) => threadId === id), { timeout: 15_000 })
      .toBe(true);
    await expect.poll(() => queue.getJob(jobId)).toBeUndefined();
    expect(await t.prisma.db.message.count({ where: { personaId } })).toBe(0);
    expect(await t.prisma.db.botThread.findUniqueOrThrow({ where: { id } })).toMatchObject({
      status: 'scheduled',
      cursor: 0,
    });
    await setting(true);
    await t.app.get(BotSchedulerService).tick();
    await expect
      .poll(() => t.prisma.db.message.count({ where: { personaId } }), { timeout: 15_000 })
      .toBe(1);
    expect(await t.prisma.db.botThread.findUniqueOrThrow({ where: { id } })).toMatchObject({
      status: 'done',
      cursor: 1,
      nextAt: null,
    });
    await t.app.get(BotSchedulerService).tick();
    const rotated = await t.prisma.db.botThread.findFirstOrThrow({
      where: { scriptId, id: { not: id } },
    });
    extraJobs.push(`bot-${rotated.id}-0`);
    // D-112: the next tick starts a new rotation, not a replay of the completed cursor.
    await expect
      .poll(() => t.prisma.db.message.count({ where: { personaId } }), { timeout: 15_000 })
      .toBe(2);
    expect(await t.prisma.db.message.count({ where: { botThreadId: id } })).toBe(1);
    expect(runner.mock.calls.filter(([threadId]) => threadId === id)).toHaveLength(2);
  });
});
