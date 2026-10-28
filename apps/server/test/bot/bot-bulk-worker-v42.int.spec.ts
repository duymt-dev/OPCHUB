import type { LlmConfigModel } from '@opchub/db';
import type { LlmProvider } from '@opchub/integrations';
import { Queue } from 'bullmq';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ENV, loadEnv } from '@/common/config';
import { LLM } from '@/common/integrations';
import { OutboxRelayService } from '@/common/outbox';
import { BULL_PREFIX, WorkerFactory } from '@/common/queue';
import { BotCoreModule, BotBulkQueueService } from '@/modules/bot';
import { BotBulkControlService } from '@/modules/bot/bulk/bot-bulk-control.service';
import { BotProcessor } from '@/worker/processors/bot.processor';
import { tokenOf } from '../factories/group.factory';
import { createUser } from '../factories/user.factory';
import { llmHttpStub } from '../helpers/llm-http-stub';
import { createTestApp, type TestApp } from '../setup/test-app';
import { BulkFixture, bulkResponse } from './bulk-fixture';

describe('D-112 bulk outbox and actual worker use committed Admin LLM configuration', () => {
  let t: TestApp;
  let f: BulkFixture;
  let stub: Awaited<ReturnType<typeof llmHttpStub>>;
  let snapshot: LlmConfigModel | null;
  let settingsToken: string;
  let relay: OutboxRelayService;
  let queue: Queue;
  const batchIds: string[] = [];
  const saveConfig = (enabled: boolean) =>
    t.call('/admin/settings/llm', {
      method: 'PUT',
      token: settingsToken,
      json: {
        baseUrl: stub.url,
        enabled,
        model: 'bulk-worker-test',
        key: 'test-bulk-key',
        maxTokens: 1024,
        timeoutMs: 1000,
      },
    });
  const row = (id: string) => t.prisma.db.botBulkBatch.findUniqueOrThrow({ where: { id } });
  beforeAll(async () => {
    stub = await llmHttpStub();
    t = await createTestApp({
      imports: [BotCoreModule],
      providers: [BotProcessor],
      overrides: [[ENV, { ...loadEnv(), NODE_ENV: 'development', BOT_LLM_PROVIDER: 'fake' }]],
    });
    f = new BulkFixture(t);
    await f.start();
    snapshot = await t.prisma.db.llmConfig.findUnique({ where: { id: 1 } });
    settingsToken = await tokenOf(
      t,
      await createUser(t, { adminPermissions: ['settings.general'] }),
    );
    await t.redis.client.del('llm:requests:minute');
    relay = t.app.get(OutboxRelayService);
    // Isolate fixture outbox dispatch, not the production worker or HTTP adapter.
    for (const type of relay.registeredTypes()) if (type !== 'bot.bulk_due') relay.unregister(type);
    queue = new Queue('bot', {
      connection: t.redis.duplicate({ prefix: '' }),
      prefix: BULL_PREFIX,
    });
    expect((await saveConfig(true)).status).toBe(200);
  });
  afterAll(async () => {
    await t.app.get(WorkerFactory).onApplicationShutdown();
    const jobs = await queue.getJobs(['waiting', 'delayed', 'completed', 'failed']);
    for (const job of jobs)
      if (batchIds.some((id) => job.id?.startsWith(`bot-bulk-${id}-`))) await job.remove();
    await queue.close();
    await f.close();
    await t.prisma.db.llmConfig.deleteMany();
    if (snapshot) await t.prisma.db.llmConfig.create({ data: snapshot });
    await t.redis.client.del('llm:requests:minute');
    await t.close();
    await stub.close();
  });
  it('relays each durable cursor to real HTTP and fences duplicate delivered jobs', async () => {
    expect(t.app.get<LlmProvider>(LLM).name).toBe('admin-configured-llm');
    const batch = await f.create({ perTopic: 2 });
    batchIds.push(batch.id);
    stub.setContent(bulkResponse());
    expect(await relay.relayOnce()).toBeGreaterThanOrEqual(1);
    await expect.poll(async () => (await row(batch.id)).cursor, { timeout: 10_000 }).toBe(1);
    expect(stub.requests).toHaveLength(1);
    expect(stub.requests[0]?.authorization).toBe('Bearer test-bulk-key');
    expect(stub.requests[0]?.body).toContain('"model":"bulk-worker-test"');
    expect(stub.requests[0]?.body).toContain('"max_tokens":1024');
    stub.setContent(bulkResponse());
    await relay.relayOnce();
    await expect.poll(async () => (await row(batch.id)).status, { timeout: 10_000 }).toBe('done');
    await t.app
      .get(BotBulkQueueService)
      .enqueue({ batchId: batch.id, cursor: 0, attempt: 0, at: new Date().toISOString() });
    await expect
      .poll(() => queue.getJob(`bot-bulk-${batch.id}-0-0`), { timeout: 10_000 })
      .toBeUndefined();
    expect(stub.requests).toHaveLength(2);
    expect(await t.prisma.db.botBulkItem.count({ where: { batchId: batch.id } })).toBe(2);
    expect(await t.prisma.db.message.count({ where: { roomId: `${f.groupId}-general` } })).toBe(0);
  });
  it('recovers a persisted draft with lost queue/outbox delivery', async () => {
    const batch = await f.create();
    batchIds.push(batch.id);
    await t.prisma.db.outboxEvent.deleteMany({
      where: { type: 'bot.bulk_due', payload: { path: ['batchId'], equals: batch.id } },
    });
    stub.setContent(bulkResponse());
    const before = stub.requests.length;
    await t.app.get(BotBulkQueueService).recover();
    await expect.poll(async () => (await row(batch.id)).status, { timeout: 10_000 }).toBe('done');
    expect(stub.requests).toHaveLength(before + 1);
  });
  it('disabled configuration fails without fake content and an explicit retry uses re-enabled real HTTP', async () => {
    expect((await saveConfig(false)).status).toBe(200);
    const before = stub.requests.length;
    const batch = await f.create();
    batchIds.push(batch.id);
    await relay.relayOnce();
    await expect.poll(async () => (await row(batch.id)).status, { timeout: 10_000 }).toBe('failed');
    expect((await row(batch.id)).error).toBe('provider');
    expect(stub.requests).toHaveLength(before);
    expect(await t.prisma.db.botBulkItem.count({ where: { batchId: batch.id } })).toBe(0);
    expect((await saveConfig(true)).status).toBe(200);
    stub.setContent(bulkResponse());
    await t.app.get(BotBulkControlService).retry(f.actor, batch.id);
    await relay.relayOnce();
    await expect.poll(async () => (await row(batch.id)).status, { timeout: 10_000 }).toBe('done');
    expect(stub.requests).toHaveLength(before + 1);
  });
});
