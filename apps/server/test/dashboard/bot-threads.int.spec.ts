import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { liveThreadSchema } from '@opchub/shared/api-domains';
import { z } from 'zod';
import { BotRunnerService } from '@/modules/bot';
import { PersonaTurnWriter } from '@/modules/chat';
import { DashboardContentCacheService } from '@/modules/dashboard';
import { DashboardThreadsRepository } from '@/modules/dashboard/dashboard-threads.repository';
import { toThreads } from '@/modules/dashboard/dashboard-blocks.mapper';
import { createUser, flushAuthState } from '../factories/user.factory';
import { tokenOf } from '../factories/group.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { replyValue } from '../bot/reply-fixture';
import { signal } from '../bot/generation-fixture';
import { ThreadFixture } from './thread-fixture';
import { FakeLlmProvider } from '@opchub/integrations';
import { LLM } from '@/common/integrations';

describe('TIP-V2-502 UAT-15 LK-11 real persona conversation feed', () => {
  let t: TestApp;
  let fixture: ThreadFixture;
  beforeAll(async () => {
    t = await createTestApp({ overrides: [[LLM, new FakeLlmProvider()]] });
    fixture = new ThreadFixture(t);
    await fixture.start();
  });
  beforeEach(async () => {
    await flushAuthState(t);
    await fixture.invalidate();
  });
  afterAll(async () => {
    await fixture.close();
    await t.close();
  });

  it('UAT-15 LK-11 script execution publishes a real opening and subsequent turn preview; publication invalidates both caches', async () => {
    const f = await fixture.room();
    await fixture.live(f.token); // warm caches before the actual post
    const { thread, at } = await fixture.thread(f.group.id, [f.persona.id, f.persona.id]);
    const runner = t.app.get(BotRunnerService);
    expect(await runner.postTurn(thread.id, 0, at)).toBe(true);
    const opening = await t.prisma.db.message.findFirstOrThrow({
      where: { botThreadId: thread.id, botOpening: true },
    });
    await fixture.publish(opening.id);
    const first = await fixture.live(f.token);
    expect(first.threads[0]).toMatchObject({
      id: opening.id,
      body: opening.body,
      author: { name: f.persona.name, color: f.persona.color },
      replyCount: 0,
      reply: null,
    });
    expect(await t.redis.client.ttl('dashboard:threads')).toBeGreaterThanOrEqual(9);
    expect(await t.redis.client.ttl('dashboard:threads')).toBeLessThanOrEqual(10);
    const next = await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: thread.id } });
    expect(await runner.postTurn(thread.id, 1, replyValue(next.nextAt))).toBe(true);
    const second = await t.prisma.db.message.findFirstOrThrow({
      where: { botThreadId: thread.id, botTurn: 1 },
    });
    await fixture.publish(second.id);
    const after = await fixture.live(f.token);
    expect(after.threads.filter((row) => row.groupId === f.group.id)).toHaveLength(1);
    expect(after.threads.find((row) => row.id === opening.id)).toMatchObject({
      replyCount: 1,
      reply: { name: f.persona.name, body: second.body },
    });
    expect(after.messages.some((row) => row.body === second.body)).toBe(true);
  });

  it('UAT-15 first successful auto turn opens the conversation even after a skipped turn; thread GC does not remove its identity', async () => {
    const f = await fixture.room();
    const second = await fixture.replies.extraPersona(f.group.id, 'Eligible automatic persona');
    await t.prisma.db.persona.update({
      where: { id: f.persona.id },
      data: { activeHours: '01:00 - 02:00' },
    });
    const { thread, at } = await fixture.thread(f.group.id, [f.persona.id, second.id], 'auto');
    const runner = t.app.get(BotRunnerService);
    expect(await runner.postTurn(thread.id, 0, at)).toBe(true);
    expect(await t.prisma.db.message.count({ where: { botThreadId: thread.id } })).toBe(0);
    const next = await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: thread.id } });
    expect(await runner.postTurn(thread.id, 1, replyValue(next.nextAt))).toBe(true);
    const message = await t.prisma.db.message.findFirstOrThrow({
      where: { botThreadId: thread.id },
    });
    expect(message).toMatchObject({ botKind: 'auto', botTurn: 1, botOpening: true });
    await t.prisma.db.botThread.delete({ where: { id: thread.id } });
    await fixture.publish(message.id);
    expect(
      (await fixture.live(f.token)).threads.find((row) => row.id === message.id)?.author.name,
    ).toBe(second.name);
  });

  it('UAT-14/15 real member reply execution appears as its own persona opening without internal simulated identity fields', async () => {
    const f = await fixture.room();
    const human = await fixture.replies.send(f.token, f.roomId, 'A real member asks for help');
    const id = replyValue(await fixture.replies.admit(human.id));
    const thread = await fixture.replies.threadOf(human.id);
    expect(await t.app.get(BotRunnerService).postTurn(id, 0, replyValue(thread.nextAt))).toBe(true);
    const reply = await t.prisma.db.message.findFirstOrThrow({ where: { botThreadId: id } });
    expect(reply).toMatchObject({ botKind: 'reply', botOpening: true, replyToId: human.id });
    await fixture.publish(reply.id);
    const dashboard = await fixture.live(f.token);
    expect(dashboard.threads.find((row) => row.id === reply.id)).toMatchObject({
      body: reply.body,
      author: { name: f.persona.name },
    });
    for (const hidden of ['isSimulated', 'botThreadId', 'botOpening', 'botKind'])
      expect(JSON.stringify(dashboard)).not.toContain(hidden);
  });

  it('UAT-15 room-scoped first openings survive skipped assignments and are never promoted after hiding or soft deletion', async () => {
    const a = await fixture.room();
    const b = await fixture.room();
    const threadId = randomUUID();
    const first = await fixture.write(a, threadId, 0);
    const other = await fixture.write(b, threadId, 1);
    expect(first.botOpening).toBe(true);
    expect(other.botOpening).toBe(true);
    await t.prisma.db.message.update({ where: { id: first.id }, data: { deletedAt: new Date() } });
    const later = await fixture.write(a, threadId, 2);
    expect(later.botOpening).toBe(false);
    const page = await t.app.get(DashboardThreadsRepository).page();
    expect(page.map((row) => row.id)).toContain(other.id);
    expect(page.map((row) => row.id)).not.toContain(first.id);
    expect(page.map((row) => row.id)).not.toContain(later.id);
  });

  it('REQ-141 hide immediately removes cached discussion/recent text even before outbox delivery, while keeping the human message', async () => {
    const f = await fixture.room();
    const opening = await fixture.write(f);
    const human = await fixture.replies.send(f.token, f.roomId, 'Human message must remain');
    await fixture.publish(opening.id);
    expect(JSON.stringify(await fixture.live(f.token))).toContain(opening.body);
    const actor = await createUser(t, { adminPermissions: ['bots.action', 'bots.view'] });
    const response = await t.call('/admin/bot/hide-messages', {
      method: 'POST',
      token: await tokenOf(t, actor),
      json: { groupIds: [f.group.id] },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ hidden: 1, rooms: 1 });
    expect(JSON.stringify(await fixture.live(f.token))).not.toContain(opening.body);
    expect(
      (await t.prisma.db.message.findUniqueOrThrow({ where: { id: human.id } })).hiddenAt,
    ).toBeNull();
  });

  it('REQ-141 a reader holding pre-hide DB results cannot repopulate a stale Dashboard cache', async () => {
    const f = await fixture.room();
    const opening = await fixture.write(f);
    await fixture.invalidate();
    const started = signal<void>();
    const release = signal<void>();
    let reads = 0;
    const cache = t.app.get(DashboardContentCacheService);
    const pending = cache.remember('threads', 10, z.array(liveThreadSchema), async () => {
      const rows = toThreads(await t.app.get(DashboardThreadsRepository).page());
      if (++reads === 1) {
        started.resolve();
        await release.promise;
      }
      return rows;
    });
    try {
      await started.promise;
      await t.prisma.db.$transaction(async (tx) => {
        await tx.message.update({ where: { id: opening.id }, data: { hiddenAt: new Date() } });
      });
      await cache.invalidate();
    } finally {
      release.resolve();
    }
    expect((await pending).some((row) => row.id === opening.id)).toBe(false);
    expect(reads).toBe(2);
    expect(await t.redis.client.get('dashboard:threads')).toBeNull();
    expect((await fixture.live(f.token)).threads.some((row) => row.id === opening.id)).toBe(false);
  });

  it('REQ-411 concurrent duplicate execution writes have one opening/turn across different personas; deleted personas retain old content', async () => {
    const f = await fixture.room();
    const other = await fixture.replies.extraPersona(f.group.id, 'Second candidate');
    const context = { threadId: randomUUID(), kind: 'script' as const, turn: 0 };
    const writer = t.app.get(PersonaTurnWriter);
    const writes = await Promise.all(
      [f.persona.id, other.id].map((personaId) =>
        t.prisma.db.$transaction((tx) =>
          writer.write(tx, {
            personaId,
            groupIds: [f.group.id],
            clientMsgId: randomUUID(),
            body: 'Concurrent opening',
            at: fixture.now(),
            context,
          }),
        ),
      ),
    );
    expect(writes.flat()).toHaveLength(1);
    const row = await t.prisma.db.message.findUniqueOrThrow({
      where: { id: replyValue(writes.flat()[0]).id },
    });
    expect(row.botOpening).toBe(true);
    await t.prisma.db.persona.delete({ where: { id: replyValue(row.personaId) } });
    const retained = (await t.app.get(DashboardThreadsRepository).page()).find(
      (r) => r.id === row.id,
    );
    expect(retained?.body).toBe('Concurrent opening');
    expect(retained?.sender).toBe('Thành viên');
  });
});
