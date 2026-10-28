import { randomUUID } from 'node:crypto';
import { Prisma } from '@opchub/db';
import { LocalLlmProvider } from '@opchub/integrations';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LLM } from '@/common/integrations';
import { BotBulkControlService } from '@/modules/bot/bulk/bot-bulk-control.service';
import { BotBulkGenerationService } from '@/modules/bot/bulk/bot-bulk-generation.service';
import { BotBulkReadService } from '@/modules/bot/bulk/bot-bulk-read.service';
import { BotConversationTypesService } from '@/modules/bot/bulk/bot-conversation-types.service';
import { llmHttpStub } from '../helpers/llm-http-stub';
import { createTestApp, type TestApp } from '../setup/test-app';
import { signal } from './generation-fixture';
import { BulkFixture, bulkResponse } from './bulk-fixture';

describe('D-112 real HTTP bulk generation and durable claim fences', () => {
  let t: TestApp;
  let f: BulkFixture;
  let llm: LocalLlmProvider;
  let stub: Awaited<ReturnType<typeof llmHttpStub>>;
  const read = (id: string) => t.app.get(BotBulkReadService).get(id);
  const items = (id: string) => t.app.get(BotBulkReadService).items(id, { after: -1, limit: 50 });
  beforeAll(async () => {
    stub = await llmHttpStub();
    llm = new LocalLlmProvider({
      baseUrl: stub.url,
      model: 'bulk-real-http',
      apiKey: 'test-only-key',
      maxRequests: 100,
      maxTokens: 1024,
    });
    t = await createTestApp({ overrides: [[LLM, llm]] });
    f = new BulkFixture(t);
    await f.start();
  });
  beforeEach(() => {
    vi.restoreAllMocks();
    stub.setMode('ok');
    stub.setContent(bulkResponse());
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    await f.close();
    await t.close();
    await stub.close();
  });

  it('uses persisted custom definitions and server persona order, sanitizes real text, and does not publish during pause', async () => {
    const types = t.app.get(BotConversationTypesService);
    const type = await types.create(f.actor, {
      name: `Interview ${randomUUID()}`,
      description: 'Hỏi kinh nghiệm quản lý thuế thực tế',
    });
    const schedule = await t.prisma.db.appSetting.findUnique({ where: { key: 'bot_schedule' } });
    await t.prisma.db.appSetting.upsert({
      where: { key: 'bot_schedule' },
      create: { key: 'bot_schedule', value: { fromDate: null, toDate: null, paused: true } },
      update: { value: { fromDate: null, toDate: null, paused: true } },
    });
    try {
      const batch = await f.create({ typeId: type.id });
      await types.remove(f.actor, type.id);
      const prefix = randomUUID();
      stub.setContent(
        JSON.stringify({
          lines: [
            `<b>${prefix} mở đầu</b>`,
            `${prefix} ý kiến một`,
            `${prefix} ý kiến hai`,
            `${prefix} kết thúc`,
          ],
        }),
      );
      await f.step(batch.id);
      const result = (await items(batch.id)).items[0]!;
      expect(result.lines[0]?.body).toBe(`${prefix} mở đầu`);
      expect(result.lines[0]?.personaId).toBe(result.lines[3]?.personaId);
      expect(result.lines[0]?.personaId).not.toBe(result.lines[1]?.personaId);
      expect(result.lines.every((line) => f.people.includes(line.personaId))).toBe(true);
      expect(stub.requests.at(-1)?.body).toContain(type.description);
      expect(stub.requests.at(-1)?.body).toContain('"max_tokens":1024');
      expect(await read(batch.id)).toMatchObject({
        status: 'done',
        cursor: 1,
        selectedCount: 1,
        typeName: type.name,
      });
      expect(await t.prisma.db.botScript.count({ where: { groupIds: { has: f.groupId } } })).toBe(
        0,
      );
      expect(await t.prisma.db.message.count({ where: { roomId: `${f.groupId}-general` } })).toBe(
        0,
      );
    } finally {
      await t.prisma.db.botConversationType.deleteMany({ where: { id: type.id } });
      if (schedule)
        await t.prisma.db.appSetting.update({
          where: { key: 'bot_schedule' },
          data: { value: schedule.value ?? Prisma.JsonNull },
        });
      else await t.prisma.db.appSetting.delete({ where: { key: 'bot_schedule' } });
    }
  });

  it('makes provider failure actionable without fake content, then retries the retained cursor', async () => {
    const batch = await f.create();
    const count = stub.requests.length;
    stub.setMode('unauthorized');
    await f.step(batch.id);
    expect(await read(batch.id)).toMatchObject({ status: 'failed', error: 'provider', cursor: 0 });
    expect((await items(batch.id)).items).toEqual([]);
    expect(stub.requests).toHaveLength(count + 1);
    expect(JSON.stringify(await read(batch.id))).not.toContain('provider-private-detail');
    stub.setMode('ok');
    stub.setContent(bulkResponse());
    await t.app.get(BotBulkControlService).retry(f.actor, batch.id);
    await f.step(batch.id);
    expect(await read(batch.id)).toMatchObject({ status: 'done', error: null, cursor: 1 });
    expect(stub.requests).toHaveLength(count + 2);
  });

  it.each([
    'not JSON',
    JSON.stringify({ lines: ['Only one'] }),
    JSON.stringify({ lines: ['Same', 'SAME!', 'Other', 'Finish'] }),
  ])(
    'bounds malformed/duplicate response retries without fabricating a repair: %s',
    async (content) => {
      const batch = await f.create();
      const count = stub.requests.length;
      stub.setContent(content);
      await f.step(batch.id);
      await f.step(batch.id);
      await f.step(batch.id);
      await f.step(batch.id);
      expect(await read(batch.id)).toMatchObject({
        status: 'failed',
        error: 'invalid_response',
        cursor: 0,
      });
      expect((await items(batch.id)).items).toEqual([]);
      expect(stub.requests).toHaveLength(count + 3);
    },
  );

  it('deduplicates against earlier durable results, preserves progress, and accepts only a new real response on retry', async () => {
    const batch = await f.create({ perTopic: 2 });
    const content = bulkResponse();
    stub.setContent(content);
    await f.step(batch.id);
    const first = (await items(batch.id)).items[0]!;
    await f.step(batch.id);
    await f.step(batch.id);
    await f.step(batch.id);
    expect(await read(batch.id)).toMatchObject({
      status: 'failed',
      error: 'duplicate',
      cursor: 1,
      selectedCount: 1,
    });
    expect((await items(batch.id)).items).toEqual([first]);
    await t.app.get(BotBulkControlService).retry(f.actor, batch.id);
    stub.setContent(bulkResponse());
    await f.step(batch.id);
    expect(await read(batch.id)).toMatchObject({ status: 'done', cursor: 2, selectedCount: 2 });
    expect((await items(batch.id)).items[0]).toEqual(first);
  });

  it('checks normalized saved script content before accepting generated results', async () => {
    const prefix = randomUUID();
    const existing = `${prefix} first line`;
    const id = `bulk-existing-${randomUUID()}`;
    f.extraScripts.push(id);
    await t.prisma.db.botScript.create({
      data: {
        id,
        topic: 'Saved before generation',
        groupIds: [f.groupId],
        lines: [{ personaId: f.people[0], body: existing }],
        enabled: false,
      },
    });
    const batch = await f.create();
    stub.setContent(
      JSON.stringify({
        lines: [
          `${existing.toUpperCase()}!`,
          `${prefix} second`,
          `${prefix} third`,
          `${prefix} last`,
        ],
      }),
    );
    await f.step(batch.id);
    await f.step(batch.id);
    await f.step(batch.id);
    expect(await read(batch.id)).toMatchObject({ status: 'failed', error: 'duplicate', cursor: 0 });
    expect((await items(batch.id)).items).toEqual([]);
  });

  it('coalesces concurrent/replayed jobs while actual HTTP generation is in flight', async () => {
    const batch = await f.create();
    const count = stub.requests.length;
    const started = signal<void>();
    const release = signal<void>();
    const original = llm.complete.bind(llm);
    vi.spyOn(llm, 'complete').mockImplementationOnce(async (prompt, options) => {
      const result = await original(prompt, options);
      started.resolve();
      await release.promise;
      return result;
    });
    const running = f.step(batch.id);
    try {
      await started.promise;
      await t.app.get(BotBulkGenerationService).run(batch.id, 0);
      expect(stub.requests).toHaveLength(count + 1);
      expect((await items(batch.id)).items).toEqual([]);
    } finally {
      release.resolve();
    }
    await running;
    await t.app.get(BotBulkGenerationService).run(batch.id, 0);
    expect((await items(batch.id)).items).toHaveLength(1);
    expect(stub.requests).toHaveLength(count + 1);
  });

  it('reclaims an expired claim and fences the late response from the old worker', async () => {
    const batch = await f.create();
    const count = stub.requests.length;
    const started = signal<void>();
    const release = signal<void>();
    const original = llm.complete.bind(llm);
    vi.spyOn(llm, 'complete').mockImplementationOnce(async (prompt, options) => {
      const result = await original(prompt, options);
      started.resolve();
      await release.promise;
      return result;
    });
    const running = f.step(batch.id);
    try {
      await started.promise;
      await t.prisma.db.botBulkBatch.update({
        where: { id: batch.id },
        data: { nextAt: new Date(Date.now() - 1), leaseUntil: new Date(Date.now() - 1) },
      });
      const prefix = `reclaimed-${randomUUID()}`;
      stub.setContent(bulkResponse(prefix));
      await f.step(batch.id);
      expect((await items(batch.id)).items[0]?.lines[0]?.body).toContain(prefix);
    } finally {
      release.resolve();
    }
    await running;
    expect((await items(batch.id)).items).toHaveLength(1);
    expect(await read(batch.id)).toMatchObject({ status: 'done', cursor: 1 });
    expect(stub.requests).toHaveLength(count + 2);
  });

  it('rechecks current group/persona eligibility before any provider request', async () => {
    const batch = await f.create();
    const count = stub.requests.length;
    await t.prisma.db.group.update({ where: { id: f.groupId }, data: { deletedAt: new Date() } });
    try {
      await f.step(batch.id);
      expect(await read(batch.id)).toMatchObject({ error: 'groups_missing', status: 'failed' });
    } finally {
      await t.prisma.db.group.update({ where: { id: f.groupId }, data: { deletedAt: null } });
    }
    await t.app.get(BotBulkControlService).retry(f.actor, batch.id);
    await t.prisma.db.persona.update({ where: { id: f.people[0]! }, data: { enabled: false } });
    try {
      await f.step(batch.id);
      expect(await read(batch.id)).toMatchObject({ error: 'personas_missing', status: 'failed' });
    } finally {
      await t.prisma.db.persona.update({ where: { id: f.people[0]! }, data: { enabled: true } });
    }
    expect(stub.requests).toHaveLength(count);
  });
});
