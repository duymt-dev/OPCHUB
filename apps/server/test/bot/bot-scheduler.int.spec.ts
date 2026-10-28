import { randomUUID } from 'node:crypto';
import { Queue } from 'bullmq';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { botSettingsSchema } from '@opchub/shared/api-domains';
import { BULL_PREFIX } from '@/common/queue';
import { BotAdmissionService, BotRunnerService, BotSchedulerService } from '@/modules/bot';
import { createGroup } from '../factories/group.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('REQ-208 UAT-15 scheduled bot execution on native storage', () => {
  let t: TestApp;
  let queue: Queue;
  let original: ReturnType<typeof botSettingsSchema.parse>;
  let originallyEnabled: string[] = [];
  const scripts: string[] = [];
  const personas: string[] = [];
  const groups: string[] = [];
  const threads: string[] = [];
  const jobs: string[] = [];
  const now = new Date('2026-10-21T05:00:00Z');

  beforeAll(async () => {
    t = await createTestApp();
    original = botSettingsSchema.parse(
      (
        await t.prisma.db.appSetting.findUniqueOrThrow({
          where: { key: 'bot' },
        })
      ).value,
    );
    originallyEnabled = (
      await t.prisma.db.botScript.findMany({ where: { enabled: true }, select: { id: true } })
    ).map((row) => row.id);
    await t.prisma.db.botScript.updateMany({ data: { enabled: false } });
    await enabled(true);
    queue = new Queue('bot', {
      connection: t.redis.duplicate({ prefix: '' }),
      prefix: BULL_PREFIX,
    });
  });
  beforeEach(async () => {
    await t.prisma.db.botScript.updateMany({
      where: { id: { in: scripts } },
      data: { enabled: false },
    });
  });
  afterAll(async () => {
    for (const id of jobs) await (await queue.getJob(id))?.remove();
    await queue.close();
    await t.prisma.db.outboxEvent.deleteMany({
      where: {
        type: 'bot.turn_due',
        OR: threads.map((id) => ({ payload: { path: ['threadId'], equals: id } })),
      },
    });
    await t.prisma.db.botScript.deleteMany({ where: { id: { in: scripts } } });
    await t.prisma.db.botScript.updateMany({
      where: { id: { in: originallyEnabled } },
      data: { enabled: true },
    });
    await t.prisma.db.group.deleteMany({ where: { id: { in: groups } } });
    await t.prisma.db.persona.deleteMany({ where: { id: { in: personas } } });
    await t.prisma.db.appSetting.update({ where: { key: 'bot' }, data: { value: original } });
    await t.close();
  });

  async function enabled(value: boolean) {
    await t.prisma.db.appSetting.update({
      where: { key: 'bot' },
      data: { value: { ...original, enabled: value, autoGenerate: false } },
    });
  }

  async function fixture(count = 2, hours = '00:00 - 24:00', quota = 20) {
    const group = await createGroup(t);
    groups.push(group.id);
    const persona = await t.prisma.db.persona.create({
      data: {
        id: randomUUID(),
        name: 'Scheduled persona',
        groupIds: [group.id],
        activeHours: hours,
        postsPerDay: quota,
      },
    });
    personas.push(persona.id);
    const script = await t.prisma.db.botScript.create({
      data: {
        id: randomUUID(),
        topic: `Schedule ${randomUUID()}`,
        groupIds: [group.id],
        lines: Array.from({ length: count }, (_, i) => ({
          personaId: persona.id,
          body: `Turn ${i + 1}`,
        })),
        runAt: now,
        delayMinutes: 1,
      },
    });
    scripts.push(script.id);
    return { script, persona, group };
  }

  async function admit(scriptId: string) {
    await t.app.get(BotAdmissionService).due(now);
    const row = await t.prisma.db.botThread.findFirstOrThrow({ where: { scriptId } });
    threads.push(row.id);
    return row;
  }

  it('UAT-15 concurrent due admission snapshots once, posts one turn per deadline and finishes without approval', async () => {
    const { script, persona } = await fixture();
    const admission = t.app.get(BotAdmissionService);
    await Promise.all([admission.due(now), admission.due(now)]);
    const rows = await t.prisma.db.botThread.findMany({ where: { scriptId: script.id } });
    expect(rows).toHaveLength(1);
    const thread = rows[0]!;
    threads.push(thread.id);
    expect(thread).toMatchObject({ status: 'scheduled', cursor: 0, nextAt: now });
    expect(thread.lines).toEqual(script.lines);
    expect(
      (await t.prisma.db.botScript.findUniqueOrThrow({ where: { id: script.id } })).lastRunAt,
    ).toEqual(now);
    const runner = t.app.get(BotRunnerService);
    expect(
      await Promise.all([
        runner.postTurn(thread.id, 0, now, () => 0),
        runner.postTurn(thread.id, 0, now, () => 0),
      ]),
    ).toEqual([true, false]);
    const running = await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: thread.id } });
    expect(running).toMatchObject({ status: 'running', cursor: 1 });
    expect(running.nextAt!.getTime() - now.getTime()).toBe(60_000);
    expect(await t.prisma.db.message.count({ where: { personaId: persona.id } })).toBe(1);
    expect(await runner.postTurn(thread.id, 1, new Date(running.nextAt!.getTime() - 1))).toBe(
      false,
    );
    expect(await runner.postTurn(thread.id, 1, running.nextAt!, () => 0)).toBe(true);
    expect(await t.prisma.db.message.count({ where: { personaId: persona.id } })).toBe(2);
    expect(
      await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: thread.id } }),
    ).toMatchObject({ status: 'done', cursor: 2, nextAt: null });
    await admission.due(new Date(now.getTime() + 600_000));
    // D-112 supersedes consumed-once scheduling: a free group rotates the eligible pool again.
    const repeated = await t.prisma.db.botThread.findMany({ where: { scriptId: script.id } });
    expect(repeated).toHaveLength(2);
    threads.push(...repeated.filter((row) => row.id !== thread.id).map((row) => row.id));
    expect(repeated.filter((row) => row.status === 'scheduled')).toHaveLength(1);
  });

  it('REQ-208 pause global/script neither queues nor advances; resume preserves the same due cursor', async () => {
    const { script, persona } = await fixture(1);
    const thread = await admit(script.id);
    const jobId = `bot-${thread.id}-0`;
    jobs.push(jobId);
    const scheduler = t.app.get(BotSchedulerService);
    const runner = t.app.get(BotRunnerService);
    await enabled(false);
    await scheduler.tick(now);
    expect(await queue.getJob(jobId)).toBeUndefined();
    expect(await runner.postTurn(thread.id, 0, now)).toBe(false);
    await enabled(true);
    await t.prisma.db.botScript.update({ where: { id: script.id }, data: { enabled: false } });
    await scheduler.tick(now);
    expect(await queue.getJob(jobId)).toBeUndefined();
    expect(await runner.postTurn(thread.id, 0, now)).toBe(false);
    expect(await t.prisma.db.message.count({ where: { personaId: persona.id } })).toBe(0);
    await t.prisma.db.botScript.update({ where: { id: script.id }, data: { enabled: true } });
    await scheduler.tick(now);
    const job = await queue.getJob(jobId);
    expect(job?.data).toEqual({ threadId: thread.id, turn: 0 });
    // Completed no-op jobs must be removed so re-enabling can enqueue the same cursor.
    expect(job?.opts).toMatchObject({ removeOnComplete: true, attempts: 3 });
    expect(await runner.postTurn(thread.id, 0, now)).toBe(true);
    expect(await t.prisma.db.message.count({ where: { personaId: persona.id } })).toBe(1);
  });

  it('REQ-208 skips only the out-of-hours turn and continues the next persona', async () => {
    const { script, persona } = await fixture(2, '01:00 - 02:00');
    const thread = await admit(script.id);
    const runner = t.app.get(BotRunnerService);
    expect(await runner.postTurn(thread.id, 0, now, () => 0)).toBe(true);
    expect(await t.prisma.db.message.count({ where: { personaId: persona.id } })).toBe(0);
    const next = await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: thread.id } });
    expect(next).toMatchObject({ cursor: 1, status: 'running' });
    await t.prisma.db.persona.update({
      where: { id: persona.id },
      data: { activeHours: '00:00 - 24:00' },
    });
    expect(await runner.postTurn(thread.id, 1, next.nextAt!, () => 0)).toBe(true);
    expect(await t.prisma.db.message.count({ where: { personaId: persona.id } })).toBe(1);
    const skipped = await t.prisma.db.botActivity.findFirst({
      where: { text: { contains: 'Bỏ lượt 1' }, createdAt: now },
    });
    expect(skipped?.messages).toBe(0);
  });

  it('REQ-208 daily quota counts deleted history and cannot be bypassed by Redis loss', async () => {
    const { script, persona, group } = await fixture(1, '00:00 - 24:00', 1);
    await t.prisma.db.message.create({
      data: {
        id: randomUUID(),
        roomId: `${group.id}-general`,
        personaId: persona.id,
        isSimulated: true,
        body: 'Earlier pruned turn',
        clientMsgId: randomUUID(),
        createdAt: now,
        deletedAt: now,
      },
    });
    const thread = await admit(script.id);
    expect(await t.app.get(BotRunnerService).postTurn(thread.id, 0, now)).toBe(true);
    expect(await t.prisma.db.message.count({ where: { personaId: persona.id } })).toBe(1);
    expect(
      await t.prisma.db.message.count({ where: { personaId: persona.id, deletedAt: null } }),
    ).toBe(0);
    expect(
      (await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: thread.id } })).status,
    ).toBe('done');
  });

  it('REQ-208 S-11 group rate rejection rolls back the cursor and retry posts once after the window', async () => {
    const { script, persona, group } = await fixture(1);
    const thread = await admit(script.id);
    const key = `chat:bot-rate:${group.id}`;
    const entries = Array.from({ length: 30 }, (_, i) => [now.getTime(), `prior-${i}`]).flat();
    await t.redis.client.zadd(key, ...entries);
    const runner = t.app.get(BotRunnerService);
    await expect(runner.postTurn(thread.id, 0, now)).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
    expect(
      await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: thread.id } }),
    ).toMatchObject({ status: 'scheduled', cursor: 0, nextAt: now });
    expect(await t.prisma.db.message.count({ where: { personaId: persona.id } })).toBe(0);
    const later = new Date(now.getTime() + 60_000);
    expect(await runner.postTurn(thread.id, 0, later)).toBe(true);
    expect(await runner.postTurn(thread.id, 0, later)).toBe(false);
    expect(await t.prisma.db.message.count({ where: { personaId: persona.id } })).toBe(1);
    expect(await t.redis.client.zcard(key)).toBe(1);
    await t.redis.client.del(key);
  });
});
