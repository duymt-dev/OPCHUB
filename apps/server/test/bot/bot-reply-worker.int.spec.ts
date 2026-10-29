import { Queue } from 'bullmq';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LocalLlmProvider, type LlmProvider } from '@opchub/integrations';
import { llmHttpStub } from '../helpers/llm-http-stub';
import { LLM } from '@/common/integrations';
import { OutboxRelayService } from '@/common/outbox';
import { BULL_PREFIX, WorkerFactory } from '@/common/queue';
import { BotCoreModule } from '@/modules/bot';
import { ChatCoreModule } from '@/modules/chat';
import { ModerationCoreModule } from '@/modules/moderation';
import { KeywordFilterService } from '@/modules/moderation/services/keyword-filter.service';
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
  let originalEnabled: string[] = [];
  let groupId: string | undefined;
  let runId: string | undefined;
  let stub: Awaited<ReturnType<typeof llmHttpStub>>;
  const keywordJobs: string[] = [];
  // V4-612 (D-77): tin thành viên trúng từ khoá bị ẩn ngay → bot không trả lời tin ẩn. Từ khoá thử
  // chỉ thêm SAU khi phiên trả lời đã nhận, để chỉ lượt persona (lặp lại chủ đề) trúng từ khoá.
  const word = `kw612${Date.now().toString(36)}`;
  beforeAll(async () => {
    stub = await llmHttpStub();
    stub.setContent(`${word} actual local HTTP reply`);
    t = await createTestApp({
      overrides: [
        [
          LLM,
          new LocalLlmProvider({
            baseUrl: stub.url,
            model: 'worker-reply',
            apiKey: 'test-only-key',
          }),
        ],
      ],
      imports: [BotCoreModule, ChatCoreModule, ModerationCoreModule],
      providers: [BotProcessor, BotPublicationProcessor, ModerationProcessor],
    });
    await t.redis.client.flushdb();
    await t.prisma.db.botReplyRun.deleteMany();
    fixture = replyFixtures(t, new Date());
    await fixture.start();
    originalEnabled = (
      await t.prisma.db.persona.findMany({ where: { enabled: true }, select: { id: true } })
    ).map((p) => p.id);
    await t.prisma.db.persona.updateMany({ data: { enabled: false } });
    await t.prisma.db.appSetting.deleteMany({ where: { key: 'bot_reply_settings' } });
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
    await t.prisma.db.moderationKeyword.deleteMany({ where: { word } });
    await t.app.get(KeywordFilterService).reload();
    await bot.close();
    await moderation.close();
    if (runId) {
      await t.prisma.db.outboxEvent.deleteMany({
        where: { type: 'bot.reply_run_due', payload: { path: ['runId'], equals: runId } },
      });
      await t.prisma.db.botReplyRun.deleteMany({ where: { id: runId } });
    }
    await fixture.close();
    await t.prisma.db.persona.updateMany({
      where: { id: { in: originalEnabled } },
      data: { enabled: true },
    });
    await t.prisma.db.appSetting.deleteMany({ where: { key: 'bot_reply_settings' } });
    if (groupId) await t.redis.client.del(`bot:reply-rate:group:${groupId}`);
    await t.redis.client.del('bot:reply-rate:system');
    await t.close();
    await stub.close();
  });

  it('HTTP send -> durable outbox -> reply worker -> actual five-second run deadline -> LLM turn -> publication/keyword worker', async () => {
    expect(t.app.get<LlmProvider>(LLM).name).toBe('local-llm');
    const f = await fixture.room();
    groupId = f.group.id;
    const keyword = { word };
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
          return t.prisma.db.botReplyRun.count({
            where: { groupId: f.group.id, status: 'running' },
          });
        },
        { timeout: 20_000 },
      )
      .toBe(1);
    const run = await t.prisma.db.botReplyRun.findFirstOrThrow({
      where: { groupId: f.group.id, status: 'running' },
    });
    runId = run.id;
    botJobs.push(`bot-reply-run-${run.id}-0`);
    expect(replyValue(run.nextAt).getTime() - run.createdAt.getTime()).toBe(5000);
    await t.prisma.db.moderationKeyword.create({ data: { word } });
    await t.app.get(KeywordFilterService).reload();
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
    expect(thread.createdAt.getTime()).toBeGreaterThanOrEqual(replyValue(run.nextAt).getTime());
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
    // Lượt persona trúng từ khoá: ẩn ngay, không tính vi phạm (không người gửi); tin nguồn vẫn hiện
    expect(
      (await t.prisma.db.message.findUniqueOrThrow({ where: { id: reply.id } })).hiddenAt,
    ).toBeInstanceOf(Date);
    expect(await t.prisma.db.moderationViolation.count({ where: { messageId: reply.id } })).toBe(0);
    expect(
      (await t.prisma.db.message.findUniqueOrThrow({ where: { id: source.id } })).hiddenAt,
    ).toBeNull();
    expect((await fixture.threadOf(source.id)).status).toBe('done');
    expect((await bot.getJob(replyJob))?.attemptsMade).toBe(1);
    const raw = await (await t.call(`/rooms/${f.roomId}/messages`, { token: f.token })).text();
    expect(raw).not.toContain('isSimulated');
    expect(raw).not.toContain('personaId');
    // Tin persona đã ẩn bị loại khỏi luồng thành viên (D-77); tin nguồn của thành viên vẫn còn
    expect(raw).not.toContain(reply.id);
    expect(raw).toContain(source.id);
    process.stdout.write(
      `UAT-14 real-worker delay=${replyValue(run.nextAt).getTime() - run.createdAt.getTime()}ms; one reply; persona report=1; provider=local-http-stub\n`,
    );
  }, 360_000);
});
