import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeLlmProvider } from '@opchub/integrations';
import { botStoredLinesSchema } from '@opchub/shared/api-domains';
import { LLM } from '@/common/integrations';
import { BotRunnerService } from '@/modules/bot';
import { createTestApp, type TestApp } from '../setup/test-app';
import { generationFixtures, signal } from './generation-fixture';
import { createUser } from '../factories/user.factory';
import { tokenOf } from '../factories/group.factory';

describe('REQ-208 durable per-turn generation on native Postgres', () => {
  let t: TestApp;
  let fixture: ReturnType<typeof generationFixtures>;
  let runner: BotRunnerService;
  const llm = new FakeLlmProvider();
  const generate = vi.spyOn(llm, 'generateTurn');
  const now = new Date('2026-10-21T05:00:00Z');
  beforeAll(async () => {
    t = await createTestApp({ overrides: [[LLM, llm]] });
    fixture = generationFixtures(t, now);
    await fixture.start();
    runner = t.app.get(BotRunnerService);
  });
  beforeEach(() => {
    generate.mockClear();
  });
  afterAll(async () => {
    await fixture.close();
    await t.close();
  });

  it('UAT-15 generates one due turn at a time with real persona/history context and idempotent replay', async () => {
    const { thread, people } = await fixture.thread();
    expect(await runner.postTurn(thread.id, 0, now)).toBe(true);
    expect(await runner.postTurn(thread.id, 0, now)).toBe(false);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0]?.[0]).toMatchObject({
      topic: thread.topic,
      persona: { id: people[0]!.id, name: people[0]!.name, tone: 'friendly', skills: 'testing' },
      history: [],
    });
    const first = await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: thread.id } });
    expect(first).toMatchObject({ status: 'running', cursor: 1 });
    expect(first.nextAt!.getTime() - now.getTime()).toBe(60_000);
    const lines = botStoredLinesSchema.parse(first.lines);
    expect(lines[0]!.body).toContain(thread.topic.slice(0, 80));
    expect(lines[1]!.body).toBe('');
    expect(await runner.postTurn(thread.id, 1, first.nextAt!)).toBe(true);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1]?.[0].history).toEqual([
      { personaId: people[0]!.id, body: lines[0]!.body },
    ]);
    const next = await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: thread.id } });
    expect(await runner.postTurn(thread.id, 2, next.nextAt!)).toBe(true);
    expect(
      await t.prisma.db.message.count({ where: { personaId: { in: people.map((p) => p.id) } } }),
    ).toBe(3);
    expect(await t.prisma.db.botTurnDraft.count({ where: { threadId: thread.id } })).toBe(3);
    expect(
      (await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: thread.id } })).status,
    ).toBe('done');
  });

  it('REQ-208 stores a successful draft before posting so a rate-limit retry does not call the provider twice', async () => {
    const { thread, group } = await fixture.thread();
    const key = `chat:bot-rate:${group.id}`;
    await t.redis.client.zadd(
      key,
      ...Array.from({ length: 30 }, (_, i) => [now.getTime(), `prior-${i}`]).flat(),
    );
    await expect(runner.postTurn(thread.id, 0, now)).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(
      (await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: thread.id } })).cursor,
    ).toBe(0);
    expect(await runner.postTurn(thread.id, 0, new Date(now.getTime() + 60_000))).toBe(true);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(await t.prisma.db.message.count({ where: { roomId: `${group.id}-general` } })).toBe(1);
    await t.redis.client.del(key);
  });

  it('REQ-208 a concurrent job cannot duplicate a live LLM claim; pause still commits without waiting for the provider', async () => {
    const { thread, group } = await fixture.thread();
    const started = signal<void>();
    const release = signal<void>();
    generate.mockImplementationOnce(async () => {
      started.resolve();
      await release.promise;
      return 'Generated after pause';
    });
    const first = runner.postTurn(thread.id, 0, now);
    try {
      await started.promise;
      expect(await runner.postTurn(thread.id, 0, now)).toBe(false);
      expect(generate).toHaveBeenCalledTimes(1);
      await fixture.enabled(false);
    } finally {
      release.resolve();
    }
    expect(await first).toBe(false);
    expect(await t.prisma.db.message.count({ where: { roomId: `${group.id}-general` } })).toBe(0);
    expect(
      (await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: thread.id } })).cursor,
    ).toBe(0);
    await fixture.enabled(true);
    expect(await runner.postTurn(thread.id, 0, now)).toBe(true);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('REQ-208 expired claims are fenced: a late older provider response cannot overwrite or post after the newer owner', async () => {
    const { thread, group } = await fixture.thread();
    const started = signal<void>();
    const release = signal<void>();
    generate.mockImplementationOnce(async () => {
      started.resolve();
      await release.promise;
      return 'Stale response';
    });
    const first = runner.postTurn(thread.id, 0, now);
    try {
      await started.promise;
      generate.mockResolvedValueOnce('New claim response');
      expect(await runner.postTurn(thread.id, 0, new Date(now.getTime() + 180_001))).toBe(true);
    } finally {
      release.resolve();
    }
    expect(await first).toBe(false);
    expect(generate).toHaveBeenCalledTimes(2);
    const messages = await t.prisma.db.message.findMany({
      where: { roomId: `${group.id}-general` },
      select: { body: true },
    });
    expect(messages).toEqual([{ body: 'New claim response' }]);
    expect(
      (
        await t.prisma.db.botTurnDraft.findUniqueOrThrow({
          where: { threadId_turn: { threadId: thread.id, turn: 0 } },
        })
      ).body,
    ).toBe('New claim response');
  });

  it('REQ-208 rejects unsafe-empty provider text without advancing and permits a valid explicit retry', async () => {
    const { thread, group } = await fixture.thread();
    generate.mockResolvedValueOnce('<script>alert(1)</script>');
    await expect(runner.postTurn(thread.id, 0, now)).rejects.toMatchObject({
      retryable: false,
      provider: 'llm',
    });
    expect(await t.prisma.db.message.count({ where: { roomId: `${group.id}-general` } })).toBe(0);
    expect(
      (await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: thread.id } })).cursor,
    ).toBe(0);
    expect(await runner.postTurn(thread.id, 0, now)).toBe(true);
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('REQ-208 skips ineligible turns without calling the provider', async () => {
    const { thread, people, group } = await fixture.thread();
    await t.prisma.db.persona.update({
      where: { id: people[0]!.id },
      data: { activeHours: '01:00 - 02:00' },
    });
    expect(await runner.postTurn(thread.id, 0, now)).toBe(true);
    expect(generate).not.toHaveBeenCalled();
    expect(await t.prisma.db.message.count({ where: { roomId: `${group.id}-general` } })).toBe(0);
    expect(
      (await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: thread.id } })).cursor,
    ).toBe(1);
  });

  it('REQ-208 slow generation does not consume the next turn spacing or backdate the posted message', async () => {
    const { thread, group } = await fixture.thread();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
    const completed = new Date(now.getTime() + 45_000);
    generate.mockImplementationOnce(() => {
      vi.setSystemTime(completed);
      return Promise.resolve('Generated after a slow provider response');
    });
    try {
      expect(await runner.postTurn(thread.id, 0, undefined)).toBe(true);
      const message = await t.prisma.db.message.findFirstOrThrow({
        where: { roomId: `${group.id}-general` },
      });
      const next = await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: thread.id } });
      if (!next.nextAt) throw new Error('Missing next generated turn deadline');
      expect(message.createdAt).toEqual(completed);
      expect(next.nextAt).toEqual(new Date(completed.getTime() + 60_000));
      expect(next.nextAt.getTime() - message.createdAt.getTime()).toBe(60_000);
    } finally {
      vi.useRealTimers();
    }
  });

  it('REQ-208 production clock rechecks an activity window that closes during generation', async () => {
    const { thread, people, group } = await fixture.thread();
    const first = people[0];
    if (!first) throw new Error('Missing persona fixture');
    await t.prisma.db.persona.update({
      where: { id: first.id },
      data: { activeHours: '8:00 - 22:00' },
    });
    const beforeClose = new Date('2026-10-21T14:59:50Z');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(beforeClose);
    generate.mockImplementationOnce(() => {
      vi.setSystemTime(new Date(beforeClose.getTime() + 20_000));
      return Promise.resolve('Generated after window closed');
    });
    try {
      expect(await runner.postTurn(thread.id, 0, undefined)).toBe(true);
      expect(generate).toHaveBeenCalledTimes(1);
      expect(await t.prisma.db.message.count({ where: { roomId: `${group.id}-general` } })).toBe(0);
      expect(
        await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: thread.id } }),
      ).toMatchObject({ cursor: 1, status: 'running' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('REQ-208 HTTP stop during generation is immediate, audited, and fences late text from publication', async () => {
    const { thread, group } = await fixture.thread();
    const actor = await createUser(t, { adminPermissions: ['bots.view', 'bots.action'] });
    const token = await tokenOf(t, actor);
    const started = signal<void>();
    const release = signal<void>();
    generate.mockImplementationOnce(async () => {
      started.resolve();
      await release.promise;
      return 'Late text after stop';
    });
    const first = runner.postTurn(thread.id, 0, now);
    try {
      await started.promise;
      const stopped = await t.call(`/admin/bot/threads/${thread.id}/stop`, {
        method: 'POST',
        token,
      });
      expect(stopped.status).toBe(200);
      expect(await stopped.json()).toEqual({ id: thread.id, status: 'done' });
    } finally {
      release.resolve();
    }
    expect(await first).toBe(false);
    expect(await runner.postTurn(thread.id, 0, now)).toBe(false);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(await t.prisma.db.message.count({ where: { roomId: `${group.id}-general` } })).toBe(0);
    expect(
      await t.prisma.db.auditLog.count({
        where: { actorId: actor.id, action: 'bot_thread.stop', entityId: thread.id },
      }),
    ).toBe(1);
  });
});
