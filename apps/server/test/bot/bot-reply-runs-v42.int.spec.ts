import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalLlmProvider } from '@opchub/integrations';
import { botReplyScanResultSchema } from '@opchub/shared/api-domains';
import { LLM } from '@/common/integrations';
import { BotReplyRunsService, BotRunnerService } from '@/modules/bot';
import { createUser } from '../factories/user.factory';
import { tokenOf } from '../factories/group.factory';
import { llmHttpStub } from '../helpers/llm-http-stub';
import { createTestApp, type TestApp } from '../setup/test-app';
import { replyFixtures } from './reply-fixture';
import { signal } from './generation-fixture';

describe('D-112 native durable per-message reply runs', () => {
  let t: TestApp;
  let fixture: ReturnType<typeof replyFixtures>;
  let stub: Awaited<ReturnType<typeof llmHttpStub>>;
  let llm: LocalLlmProvider;
  let token: string;
  let viewer: string;
  let originalEnabled: string[];
  const groups: string[] = [];
  const endpoint = '/admin/bot/replies';
  const patch = (json: unknown) => t.call(`${endpoint}/settings`, { method: 'PATCH', token, json });
  beforeAll(async () => {
    stub = await llmHttpStub();
    llm = new LocalLlmProvider({
      baseUrl: stub.url,
      model: 'reply-run-stub',
      apiKey: 'test-only-key',
    });
    t = await createTestApp({ overrides: [[LLM, llm]] });
    fixture = replyFixtures(t, new Date());
    await fixture.start();
    originalEnabled = (
      await t.prisma.db.persona.findMany({ where: { enabled: true }, select: { id: true } })
    ).map((p) => p.id);
    token = await tokenOf(
      t,
      await createUser(t, { adminPermissions: ['bots.view', 'bots.action'] }),
    );
    viewer = await tokenOf(t, await createUser(t, { adminPermissions: ['bots.view'] }));
  });
  beforeEach(async () => {
    await t.prisma.db.persona.updateMany({ data: { enabled: false } });
    await t.prisma.db.appSetting.deleteMany({
      where: { key: { in: ['bot_schedule', 'bot_reply_settings', 'bot_control'] } },
    });
    await t.redis.client.del('bot:reply-rate:system');
    await fixture.settings();
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    const runs = await t.prisma.db.botReplyRun.findMany({
      where: { groupId: { in: groups } },
      select: { id: true },
    });
    await t.prisma.db.outboxEvent.deleteMany({
      where: {
        type: 'bot.reply_run_due',
        OR: runs.map((run) => ({ payload: { path: ['runId'], equals: run.id } })),
      },
    });
    await t.prisma.db.botReplyRun.deleteMany({ where: { groupId: { in: groups } } });
    await t.prisma.db.appSetting.deleteMany({
      where: { key: { in: ['bot_schedule', 'bot_reply_settings', 'bot_control'] } },
    });
    await t.redis.client.del(
      'bot:reply-rate:system',
      ...groups.map((id) => `bot:reply-rate:group:${id}`),
    );
    await fixture.close();
    await t.prisma.db.persona.updateMany({
      where: { id: { in: originalEnabled } },
      data: { enabled: true },
    });
    await t.close();
    await stub.close();
  });

  async function room(count: number) {
    const f = await fixture.room();
    groups.push(f.group.id);
    await t.prisma.db.message.createMany({
      data: Array.from({ length: count }, (_, i) => ({
        roomId: f.roomId,
        senderId: f.user.id,
        body: `Question ${i}`,
        createdAt: new Date(Date.now() + i),
      })),
    });
    return f;
  }
  async function start() {
    const response = await t.call(`${endpoint}/scan`, { method: 'POST', token, json: {} });
    expect(response.status).toBe(202);
    const run = botReplyScanResultSchema.parse(await response.json()).run;
    if (!run) throw new Error('Expected active reply run');
    return run;
  }
  async function materialize(runId: string) {
    const run = await t.prisma.db.botReplyRun.findUniqueOrThrow({ where: { id: runId } });
    if (!run.nextAt) throw new Error('Expected next message deadline');
    await t.app.get(BotReplyRunsService).materialize(run.id, run.cursor, run.nextAt);
    const next = await t.prisma.db.botReplyRun.findUniqueOrThrow({ where: { id: runId } });
    const source = run.messageIds[run.cursor];
    if (!next.activeThreadId || !source) throw new Error('Expected admitted reply');
    await fixture.threadOf(source);
    return { threadId: next.activeThreadId, at: run.nextAt, source };
  }

  it('enforces permissions, strict bounds and missing-run errors on actual HTTP', async () => {
    expect((await t.call(`${endpoint}/settings`)).status).toBe(401);
    expect((await t.call(`${endpoint}/settings`, { token: viewer })).status).toBe(200);
    expect(
      (
        await t.call(`${endpoint}/settings`, {
          method: 'PATCH',
          token: viewer,
          json: { delaySeconds: 5 },
        })
      ).status,
    ).toBe(403);
    expect(
      (await t.call(`${endpoint}/scan`, { method: 'POST', token: viewer, json: {} })).status,
    ).toBe(403);
    expect(
      (await t.call(`${endpoint}/absent/stop`, { method: 'POST', token: viewer })).status,
    ).toBe(403);
    expect((await patch({ delaySeconds: 601 })).status).toBe(400);
    expect((await patch({ sampleSize: 0 })).status).toBe(400);
    expect((await patch({ unknown: 'x'.repeat(2_000_000) })).status).toBe(413);
    expect((await t.call(`${endpoint}/absent/stop`, { method: 'POST', token })).status).toBe(404);
  });

  it('manual scan with auto-off replies once per message, ignoring legacy hours/quota/cooldown', async () => {
    const f = await room(3);
    await t.prisma.db.persona.update({
      where: { id: f.persona.id },
      data: { activeHours: 'invalid legacy hours', postsPerDay: 1 },
    });
    expect((await patch({ autoEnabled: false, sampleSize: 50, delaySeconds: 1 })).status).toBe(200);
    expect(await t.app.get(BotReplyRunsService).scan()).toBeNull();
    const run = await start();
    expect(run).toMatchObject({ groupId: f.group.id, total: 3, manual: true });
    expect((await start()).id).toBe(run.id);
    const first = await materialize(run.id);
    const runner = t.app.get(BotRunnerService);
    expect(await runner.postTurn(first.threadId, 0, first.at)).toBe(true);
    expect(await runner.postTurn(first.threadId, 0, first.at)).toBe(false);
    const second = await materialize(run.id);
    expect(second.at.getTime() - first.at.getTime()).toBe(1000);
    expect(await runner.postTurn(second.threadId, 0, second.at)).toBe(true);
    const third = await materialize(run.id);
    expect(third.at.getTime() - second.at.getTime()).toBe(1000);
    expect(await runner.postTurn(third.threadId, 0, third.at)).toBe(true);
    const saved = await t.prisma.db.botReplyRun.findUniqueOrThrow({ where: { id: run.id } });
    expect(saved).toMatchObject({
      cursor: 3,
      posted: 3,
      status: 'done',
      activeThreadId: null,
      nextAt: null,
    });
    const answers = await t.prisma.db.message.findMany({
      where: { roomId: f.roomId, isSimulated: true },
      select: { replyToId: true, body: true },
    });
    expect(answers).toHaveLength(3);
    expect(new Set(answers.map((a) => a.replyToId)).size).toBe(3);
    expect(answers.every((a) => a.body === 'OK from local stub')).toBe(true);
    expect(
      await t.prisma.db.outboxEvent.count({
        where: { type: 'bot.reply_run_due', payload: { path: ['runId'], equals: run.id } },
      }),
    ).toBe(3);
  });

  it('stopping during real HTTP generation fences publication and rejects repeated stop', async () => {
    const f = await room(1);
    const run = await start();
    const current = await materialize(run.id);
    const started = signal<void>();
    const release = signal<void>();
    const original = llm.generateTurn.bind(llm);
    const generated = vi.spyOn(llm, 'generateTurn').mockImplementationOnce(async (context) => {
      const result = await original(context);
      started.resolve();
      await release.promise;
      return result;
    });
    const pending = t.app.get(BotRunnerService).postTurn(current.threadId, 0, current.at);
    try {
      await started.promise;
      expect((await t.call(`${endpoint}/${run.id}/stop`, { method: 'POST', token })).status).toBe(
        200,
      );
    } finally {
      release.resolve();
    }
    expect(await pending).toBe(false);
    generated.mockRestore();
    expect((await t.call(`${endpoint}/${run.id}/stop`, { method: 'POST', token })).status).toBe(
      409,
    );
    expect(
      await t.prisma.db.message.count({ where: { roomId: f.roomId, isSimulated: true } }),
    ).toBe(0);
    expect(
      await t.prisma.db.botReplyRun.findUniqueOrThrow({ where: { id: run.id } }),
    ).toMatchObject({ status: 'stopped', cursor: 0, activeThreadId: null });
  });

  it('publication budget rejection preserves cursor and draft for retry without another AI call', async () => {
    const f = await room(1);
    const run = await start();
    const current = await materialize(run.id);
    const count = stub.requests.length;
    await t.redis.client.zadd(
      `bot:reply-rate:group:${f.group.id}`,
      ...Array.from({ length: 12 }, (_, i) => [current.at.getTime(), `used-${i}`]).flat(),
    );
    const runner = t.app.get(BotRunnerService);
    await expect(runner.postTurn(current.threadId, 0, current.at)).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
    expect(stub.requests).toHaveLength(count + 1);
    expect(
      await t.prisma.db.botReplyRun.findUniqueOrThrow({ where: { id: run.id } }),
    ).toMatchObject({ cursor: 0, posted: 0 });
    await t.redis.client.del(`bot:reply-rate:group:${f.group.id}`);
    expect(await runner.postTurn(current.threadId, 0, current.at)).toBe(true);
    expect(stub.requests).toHaveLength(count + 1);
  });

  it('auto-off does not cancel an admitted batch, but global pause blocks generation until resumed', async () => {
    const f = await room(1);
    const run = await t.app.get(BotReplyRunsService).scan();
    if (!run) throw new Error('Expected automatic run');
    expect(run.manual).toBe(false);
    expect((await patch({ autoEnabled: false })).status).toBe(200);
    const current = await materialize(run.id);
    const pause = (paused: boolean) =>
      t.call('/admin/bot/schedule', { method: 'PATCH', token, json: { paused } });
    expect((await pause(true)).status).toBe(200);
    const calls = stub.requests.length;
    const runner = t.app.get(BotRunnerService);
    expect(await runner.postTurn(current.threadId, 0, current.at)).toBe(false);
    expect(stub.requests).toHaveLength(calls);
    expect((await t.call(`${endpoint}/scan`, { method: 'POST', token, json: {} })).status).toBe(
      409,
    );
    expect((await pause(false)).status).toBe(200);
    expect(await runner.postTurn(current.threadId, 0, current.at)).toBe(true);
    expect(
      await t.prisma.db.message.count({ where: { roomId: f.roomId, isSimulated: true } }),
    ).toBe(1);
  });

  it('automatic scan observes the twenty-second boundary independently of member-send events', async () => {
    const runs = t.app.get(BotReplyRunsService);
    const at = new Date();
    expect(await runs.scan(undefined, at)).toBeNull();
    const f = await room(1);
    expect(await runs.scan(undefined, new Date(at.getTime() + 19_999))).toBeNull();
    const run = await runs.scan(undefined, new Date(at.getTime() + 20_000));
    expect(run?.groupId).toBe(f.group.id);
    if (!run) throw new Error('Expected scan at boundary');
    expect((await t.call(`${endpoint}/${run.id}/stop`, { method: 'POST', token })).status).toBe(
      200,
    );
  });

  it('failed generation advances durable progress without fake content and can be rescanned later', async () => {
    const f = await room(1);
    const run = await start();
    const current = await materialize(run.id);
    stub.setMode('unauthorized');
    await expect(
      t.app.get(BotRunnerService).postTurn(current.threadId, 0, current.at),
    ).rejects.toThrow('401');
    await t.app.get(BotReplyRunsService).failThread(current.threadId, current.at);
    expect(
      await t.prisma.db.botReplyRun.findUniqueOrThrow({ where: { id: run.id } }),
    ).toMatchObject({ status: 'done', cursor: 1, posted: 0 });
    stub.setMode('ok');
    const retry = await start();
    const next = await materialize(retry.id);
    expect(await t.app.get(BotRunnerService).postTurn(next.threadId, 0, next.at)).toBe(true);
    expect(
      await t.prisma.db.message.count({ where: { roomId: f.roomId, isSimulated: true } }),
    ).toBe(1);
  });
});
