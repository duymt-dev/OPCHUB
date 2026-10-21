import { Queue } from 'bullmq';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { LlmProvider } from '@opchub/integrations';
import { LLM } from '@/common/integrations';
import { OutboxRelayService } from '@/common/outbox';
import { BULL_PREFIX, WorkerFactory } from '@/common/queue';
import { BotCoreModule } from '@/modules/bot';
import { ChatCoreModule } from '@/modules/chat';
import { ModerationCoreModule } from '@/modules/moderation';
import { BotProcessor } from '@/worker/processors/bot.processor';
import { BotPublicationProcessor } from '@/worker/processors/bot-publication.processor';
import { ModerationProcessor } from '@/worker/processors/moderation.processor';
import { createTestApp, type TestApp } from '../setup/test-app';
import { replyFixtures, replyValue } from './reply-fixture';

describe('UAT-14 REQ-207 real worker member reply pipeline', () => {
  let t: TestApp;
  let fixture: ReturnType<typeof replyFixtures>;
  let bot: Queue;
  let moderation: Queue;
  const botJobs: string[] = [];
  const keywordJobs: string[] = [];
  beforeAll(async () => {
    t = await createTestApp({
      imports: [BotCoreModule, ChatCoreModule, ModerationCoreModule],
      providers: [BotProcessor, BotPublicationProcessor, ModerationProcessor],
    });
    fixture = replyFixtures(t, new Date());
    await fixture.start();
    bot = new Queue('bot', { connection: t.redis.duplicate({ prefix: '' }), prefix: BULL_PREFIX });
    moderation = new Queue('moderation', {
      connection: t.redis.duplicate({ prefix: '' }),
      prefix: BULL_PREFIX,
    });
  });
  afterAll(async () => {
    await t.app.get(WorkerFactory).onApplicationShutdown();
    for (const id of botJobs) await (await bot.getJob(id))?.remove();
    for (const id of keywordJobs) await (await moderation.getJob(id))?.remove();
    await bot.close();
    await moderation.close();
    await fixture.close();
    await t.close();
  });

  it('HTTP send -> durable outbox -> reply worker -> actual 30s-5m deadline -> LLM turn -> publication/keyword worker', async () => {
    expect(t.app.get<LlmProvider>(LLM).name).toBe('fake');
    const f = await fixture.room();
    const keyword = await t.prisma.db.moderationKeyword.findFirstOrThrow({
      select: { word: true },
    });
    const source = await fixture.send(
      f.token,
      f.roomId,
      `${keyword.word} - member question for worker acceptance`,
    );
    const replyJob = `bot-reply-${source.id}`;
    botJobs.push(replyJob);
    keywordJobs.push(`kw-${source.id}`);
    const relay = t.app.get(OutboxRelayService);
    await expect
      .poll(
        async () => {
          await relay.relayOnce();
          return t.prisma.db.botThread.count({ where: { triggerMessageId: source.id } });
        },
        { timeout: 20_000 },
      )
      .toBe(1);
    const thread = await fixture.threadOf(source.id);
    botJobs.push(`bot-${thread.id}-0`);
    expect(replyValue(thread.nextAt).getTime() - thread.createdAt.getTime()).toBeGreaterThanOrEqual(
      30_000,
    );
    expect(replyValue(thread.nextAt).getTime() - thread.createdAt.getTime()).toBeLessThanOrEqual(
      300_000,
    );
    expect(
      await t.prisma.db.message.count({ where: { replyToId: source.id, isSimulated: true } }),
    ).toBe(0);
    await relay.relayOnce();
    // No mocked business service, database clock edit or fast-forward: wait for the actual worker deadline.
    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(0, replyValue(thread.nextAt).getTime() - Date.now())),
    );
    await expect
      .poll(
        () => t.prisma.db.message.count({ where: { replyToId: source.id, isSimulated: true } }),
        { timeout: 20_000 },
      )
      .toBe(1);
    const reply = await t.prisma.db.message.findFirstOrThrow({
      where: { replyToId: source.id, isSimulated: true },
    });
    expect(reply.createdAt.getTime()).toBeGreaterThanOrEqual(replyValue(thread.nextAt).getTime());
    expect(reply.body).toContain(keyword.word);
    botJobs.push(`bot-publish-${reply.id}`);
    keywordJobs.push(`kw-${reply.id}`);
    await expect
      .poll(
        async () => {
          await relay.relayOnce();
          return t.prisma.db.report.count({ where: { messageId: reply.id, source: 'auto' } });
        },
        { timeout: 20_000 },
      )
      .toBe(1);
    expect((await fixture.threadOf(source.id)).status).toBe('done');
    expect((await bot.getJob(replyJob))?.attemptsMade).toBe(1);
    const raw = await (await t.call(`/rooms/${f.roomId}/messages`, { token: f.token })).text();
    expect(raw).not.toContain('isSimulated');
    expect(raw).not.toContain('personaId');
    expect(raw).toContain(f.persona.name);
    process.stdout.write(
      `UAT-14 real-worker delay=${replyValue(thread.nextAt).getTime() - thread.createdAt.getTime()}ms; one reply; persona report=1; provider=fake\n`,
    );
  }, 360_000);
});
