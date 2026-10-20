import { randomUUID } from 'node:crypto';
import { Queue } from 'bullmq';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeLlmProvider } from '@opchub/integrations';
import { botSettingsSchema } from '@opchub/shared/api-domains';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { LLM } from '@/common/integrations';
import { OutboxRelayService } from '@/common/outbox';
import { BULL_PREFIX, QueueService } from '@/common/queue';
import { BotRunnerService, BotWorkQueueService, BotEmergencyCleanupService } from '@/modules/bot';
import { BotKillSwitchService } from '@/modules/bot/services/bot-kill-switch.service';
import { BOT_CONTROL_KEY } from '@/modules/bot/services/bot-control-fence.service';
import { createTestApp, type TestApp } from '../setup/test-app';
import { createUser, flushAuthState } from '../factories/user.factory';
import { tokenOf } from '../factories/group.factory';
import { replyFixtures, replyValue } from './reply-fixture';
import { EmergencyFixture } from './emergency-fixture';
import { signal } from './generation-fixture';

describe('TIP-V2-502 REQ-141 global emergency stop on native storage', () => {
  let t: TestApp;
  let fixture: ReturnType<typeof replyFixtures>;
  let emergency: EmergencyFixture;
  let admin: { id: string; token: string };
  let monitor: Queue;
  const ownedJobs: string[] = [];
  const llm = new FakeLlmProvider();
  const generate = vi.spyOn(llm, 'generateTurn');
  const now = new Date();
  beforeAll(async () => {
    t = await createTestApp({ overrides: [[LLM, llm]] });
    monitor = new Queue('bot', {
      connection: t.redis.duplicate({ prefix: '' }),
      prefix: BULL_PREFIX,
    });
    emergency = new EmergencyFixture(t);
    await emergency.start();
    fixture = replyFixtures(t, now);
    await fixture.start();
    const user = await createUser(t, { adminPermissions: ['bots.view', 'bots.action'] });
    admin = { id: user.id, token: await tokenOf(t, user) };
  });
  beforeEach(async () => {
    await flushAuthState(t);
    await fixture.settings();
    generate.mockClear();
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    await fixture.close();
    await emergency.close();
    for (const id of ownedJobs) await (await monitor.getJob(id))?.remove();
    await monitor.close();
    await t.close();
  });

  it('RB-R07 VIEW_ONLY and unauthenticated callers cannot stop or mutate settings/audit', async () => {
    const viewer = await tokenOf(t, await createUser(t, { adminPermissions: ['bots.view'] }));
    const before = await t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'bot' } });
    const count = await t.prisma.db.auditLog.count({ where: { action: 'bot.emergency_stop' } });
    const denied = await t.call('/admin/bot/emergency-stop', { method: 'POST', token: viewer });
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ error: { code: 'VIEW_ONLY' } });
    expect((await t.call('/admin/bot/emergency-stop', { method: 'POST' })).status).toBe(401);
    expect(
      (await t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'bot' } })).value,
    ).toEqual(before.value);
    expect(await t.prisma.db.auditLog.count({ where: { action: 'bot.emergency_stop' } })).toBe(
      count,
    );
  });

  it('REQ-141 stops every scheduled/running conversation atomically, retains configuration and audits the actor', async () => {
    const f = await fixture.room();
    const source = await fixture.send(f.token, f.roomId);
    const id = replyValue(await fixture.admit(source.id));
    const other = await t.prisma.db.botThread.create({
      data: {
        topic: 'Running script',
        kind: 'script',
        status: 'running',
        groupIds: [f.group.id],
        lines: [{ personaId: f.persona.id, body: 'Must never be posted' }],
        nextAt: now,
      },
    });
    try {
      const active = await t.prisma.db.botThread.count({
        where: { status: { in: ['scheduled', 'running'] } },
      });
      const before = botSettingsSchema.parse(
        (await t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'bot' } })).value,
      );
      const stopped = await t.call('/admin/bot/emergency-stop', {
        method: 'POST',
        token: admin.token,
      });
      expect(stopped.status).toBe(200);
      expect(await stopped.json()).toEqual({ enabled: false, stopped: active });
      expect(
        await t.prisma.db.botThread.count({ where: { status: { in: ['scheduled', 'running'] } } }),
      ).toBe(0);
      expect(await t.prisma.db.botThread.findUniqueOrThrow({ where: { id } })).toMatchObject({
        status: 'done',
        nextAt: null,
      });
      expect(
        await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: other.id } }),
      ).toMatchObject({ status: 'done', nextAt: null });
      expect(
        (await t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'bot' } })).value,
      ).toEqual({ ...before, enabled: false });
      expect(
        await t.prisma.db.auditLog.count({
          where: { actorId: admin.id, action: 'bot.emergency_stop', entityId: 'bot' },
        }),
      ).toBe(1);
      expect(
        await t.app.get(BotRunnerService).postTurn(id, 0, new Date(now.getTime() + 300000)),
      ).toBe(false);
      await t.app.get(BotWorkQueueService).turns([{ threadId: id, turn: 0 }]);
      expect(await monitor.getJob(`bot-${id}-0`)).toBeUndefined();
      const again = await t.call('/admin/bot/emergency-stop', {
        method: 'POST',
        token: admin.token,
      });
      expect(await again.json()).toEqual({ enabled: false, stopped: 0 });
    } finally {
      await t.prisma.db.botThread.delete({ where: { id: other.id } });
    }
  });

  it('REQ-141 durable stop fence rejects old member/outbox replay even after re-enable and Redis loss; new messages still work', async () => {
    const f = await fixture.room();
    const old = await fixture.send(f.token, f.roomId);
    expect(
      (await t.call('/admin/bot/emergency-stop', { method: 'POST', token: admin.token })).status,
    ).toBe(200);
    await t.redis.client.del('settings:bot');
    expect(
      (
        await t.call('/admin/bot/settings', {
          method: 'PATCH',
          token: admin.token,
          json: { enabled: true },
        })
      ).status,
    ).toBe(200);
    expect(await fixture.admit(old.id)).toBeNull();
    await t.app.get(BotWorkQueueService).reply(old.id);
    expect(await monitor.getJob(`bot-reply-${old.id}`)).toBeUndefined();
    expect(await t.prisma.db.botThread.count({ where: { triggerMessageId: old.id } })).toBe(0);
    const fresh = await fixture.send(f.token, f.roomId, 'New question after restarting automation');
    const freshId = replyValue(await fixture.admit(fresh.id));
    const jobId = `bot-${freshId}-0`;
    ownedJobs.push(jobId);
    await t.app.get(BotWorkQueueService).turns([{ threadId: freshId, turn: 0 }]);
    expect(await monitor.getJob(jobId)).toBeDefined();
    const stopEvent = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: { type: 'bot.emergency_stopped' },
      orderBy: { id: 'desc' },
    });
    // A delayed cleanup event must not erase new work accepted after re-enable.
    await t.app
      .get(BotEmergencyCleanupService)
      .handle(parseOutboxPayload('bot.emergency_stopped', stopEvent.payload).at);
    expect(await monitor.getJob(jobId)).toBeDefined();
  });

  it('REQ-141 stops an in-flight LLM turn without waiting and fences its late result after re-enable', async () => {
    const f = await fixture.room();
    const source = await fixture.send(f.token, f.roomId);
    const id = replyValue(await fixture.admit(source.id));
    const thread = await fixture.threadOf(source.id);
    const started = signal<void>();
    const release = signal<void>();
    generate.mockImplementationOnce(async () => {
      started.resolve();
      await release.promise;
      return 'Late emergency response';
    });
    const runner = t.app.get(BotRunnerService);
    const pending = runner.postTurn(id, 0, replyValue(thread.nextAt));
    try {
      await started.promise;
      expect(
        (await t.call('/admin/bot/emergency-stop', { method: 'POST', token: admin.token })).status,
      ).toBe(200);
      await fixture.settings();
    } finally {
      release.resolve();
    }
    expect(await pending).toBe(false);
    expect(await runner.postTurn(id, 0, replyValue(thread.nextAt))).toBe(false);
    expect(
      await t.prisma.db.message.count({ where: { replyToId: source.id, isSimulated: true } }),
    ).toBe(0);
  });

  it('REQ-141 failed audit rolls back settings, thread transitions, fence and durable cleanup event', async () => {
    const f = await fixture.room();
    const source = await fixture.send(f.token, f.roomId);
    const id = replyValue(await fixture.admit(source.id));
    const active = await fixture.threadOf(source.id);
    const before = await t.prisma.db.appSetting.findUnique({ where: { key: BOT_CONTROL_KEY } });
    const count = await t.prisma.db.outboxEvent.count({ where: { type: 'bot.emergency_stopped' } });
    await expect(
      t.app.get(BotKillSwitchService).stop({ id: admin.id, ip: 'invalid-inet-for-rollback' }),
    ).rejects.toThrow();
    expect(
      botSettingsSchema.parse(
        (await t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'bot' } })).value,
      ).enabled,
    ).toBe(true);
    expect(await t.prisma.db.appSetting.findUnique({ where: { key: BOT_CONTROL_KEY } })).toEqual(
      before,
    );
    expect(await t.prisma.db.botThread.findUniqueOrThrow({ where: { id } })).toMatchObject({
      status: active.status,
      nextAt: active.nextAt,
      cursor: active.cursor,
      updatedAt: active.updatedAt,
    });
    expect(await t.prisma.db.outboxEvent.count({ where: { type: 'bot.emergency_stopped' } })).toBe(
      count,
    );
  });

  it('REQ-141 transaction → real outbox relay → pending-job cleanup is replay-safe and invalidates cached settings', async () => {
    const queue = t.app.get(QueueService);
    const oldJob = `stop-${randomUUID()}`;
    const publication = `publish-retain-${randomUUID()}`;
    ownedJobs.push(oldJob, publication);
    await queue.add('bot', 'reply', { messageId: randomUUID() }, { jobId: oldJob, delay: 600000 });
    await queue.add(
      'bot',
      'publishTurn',
      { messageId: randomUUID() },
      { jobId: publication, delay: 600000 },
    );
    expect(
      (await t.call('/admin/bot/emergency-stop', { method: 'POST', token: admin.token })).status,
    ).toBe(200);
    const relay = t.app.get(OutboxRelayService);
    const cleanup = t.app.get(BotEmergencyCleanupService);
    relay.register('bot.emergency_stopped', ({ at }) => cleanup.handle(at));
    await t.redis.client.set('settings:bot', JSON.stringify({ enabled: true }));
    expect(await relay.relayOnce()).toBeGreaterThan(0);
    expect(await t.redis.client.get('settings:bot')).toBeNull();
    expect(await monitor.getJob(oldJob)).toBeUndefined();
    expect(await monitor.getJob(publication)).toBeDefined();
    expect(
      await t.prisma.db.outboxEvent.count({
        where: { type: 'bot.emergency_stopped', dispatchedAt: null },
      }),
    ).toBe(0);
    const event = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: { type: 'bot.emergency_stopped' },
      orderBy: { id: 'desc' },
    });
    const payload = parseOutboxPayload('bot.emergency_stopped', event.payload);
    await cleanup.handle(payload.at);
    expect(await t.redis.client.get('queue:cleanup:bot:was-paused')).toBeNull();
  });
});
