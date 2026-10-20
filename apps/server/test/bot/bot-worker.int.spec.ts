import { randomUUID } from 'node:crypto';
import { Queue } from 'bullmq';
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
  const jobId = `bot-${id}-0`;

  beforeAll(async () => {
    t = await createTestApp({ imports: [BotCoreModule], providers: [BotProcessor] });
    queue = new Queue('bot', {
      connection: t.redis.duplicate({ prefix: '' }),
      prefix: BULL_PREFIX,
    });
    original = botSettingsSchema.parse(
      (await t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'bot' } })).value,
    );
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
    await queue.close();
    await t.prisma.db.outboxEvent.deleteMany({
      where: { type: 'bot.turn_due', payload: { path: ['threadId'], equals: id } },
    });
    await t.prisma.db.botScript.deleteMany({ where: { id: scriptId } });
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
    expect(await t.prisma.db.message.count({ where: { personaId } })).toBe(1);
    expect(runner.mock.calls.filter(([threadId]) => threadId === id)).toHaveLength(2);
  });
});
