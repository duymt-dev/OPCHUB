import { randomUUID } from 'node:crypto';
import { LocalLlmProvider } from '@opchub/integrations';
import { apiErrorSchema } from '@opchub/shared/api';
import {
  botBulkBatchSchema,
  botBulkItemsPageSchema,
  botBulkSavedSchema,
  scriptSchema,
} from '@opchub/shared/api-domains';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LLM } from '@/common/integrations';
import { BotBulkControlService } from '@/modules/bot/bulk/bot-bulk-control.service';
import { tokenOf } from '../factories/group.factory';
import { createUser } from '../factories/user.factory';
import { llmHttpStub } from '../helpers/llm-http-stub';
import { createTestApp, type TestApp } from '../setup/test-app';
import { BulkFixture, bulkResponse } from './bulk-fixture';

describe('D-112 real bulk API persistence, selection and audited save', () => {
  let t: TestApp;
  let f: BulkFixture;
  let llm: LocalLlmProvider;
  let stub: Awaited<ReturnType<typeof llmHttpStub>>;
  let viewer: string;
  const endpoint = '/admin/bot/bulk-scripts';
  const post = (suffix: string, json: unknown = {}, token = f.token) =>
    t.call(`${endpoint}${suffix}`, { method: 'POST', token, json });
  const select = (id: string, itemIds: string[], selected: boolean) =>
    t.call(`${endpoint}/${id}/selection`, {
      method: 'PATCH',
      token: f.token,
      json: { itemIds, selected },
    });
  const items = async (id: string, query = '') =>
    botBulkItemsPageSchema.parse(
      await (await t.call(`${endpoint}/${id}/items${query}`, { token: f.token })).json(),
    );
  beforeAll(async () => {
    stub = await llmHttpStub();
    llm = new LocalLlmProvider({
      baseUrl: stub.url,
      model: 'bulk-api-test',
      apiKey: 'test-only-key',
      maxRequests: 100,
      maxTokens: 1024,
    });
    t = await createTestApp({ overrides: [[LLM, llm]] });
    f = new BulkFixture(t);
    await f.start();
    viewer = await tokenOf(t, await createUser(t, { adminPermissions: ['bots.view'] }));
  });
  afterAll(async () => {
    await f.close();
    await t.close();
    await stub.close();
  });

  it('enforces authentication/action permission on every new write', async () => {
    const id = randomUUID();
    expect((await t.call(`${endpoint}/latest`)).status).toBe(401);
    expect((await t.call(endpoint, { method: 'POST', json: f.input() })).status).toBe(401);
    expect((await t.call(`${endpoint}/latest`, { token: viewer })).status).toBe(200);
    expect((await post('', f.input(), viewer)).status).toBe(403);
    expect((await post(`/${id}/save`, {}, viewer)).status).toBe(403);
    expect((await post(`/${id}/retry`, {}, viewer)).status).toBe(403);
    expect(
      (
        await t.call(`${endpoint}/${id}/selection`, {
          method: 'PATCH',
          token: viewer,
          json: { itemIds: [randomUUID()], selected: false },
        })
      ).status,
    ).toBe(403);
    expect(await t.prisma.db.botBulkBatch.count({ where: { actorId: f.actor.id } })).toBe(0);
  });
  it('deduplicates input and simultaneous request replay into one audited outbox-backed batch', async () => {
    const input = f.input({
      topics: [' Thuế ', 'THUẾ', ' Kế toán '],
      groupIds: [f.groupId, f.groupId],
    });
    const responses = await Promise.all([post('', input), post('', input)]);
    expect(responses.map((r) => r.status)).toEqual([202, 202]);
    const batches = await Promise.all(
      responses.map(async (r) => botBulkBatchSchema.parse(await r.json())),
    );
    expect(batches[0]).toEqual(batches[1]);
    const batch = batches[0]!;
    expect(batch).toMatchObject({
      topics: ['Thuế', 'Kế toán'],
      groupIds: [f.groupId],
      total: 2,
      cursor: 0,
      status: 'running',
    });
    expect(
      await t.prisma.db.auditLog.count({
        where: { entityId: batch.id, action: 'bot.bulk.create' },
      }),
    ).toBe(1);
    expect(
      await t.prisma.db.outboxEvent.count({
        where: { type: 'bot.bulk_due', payload: { path: ['batchId'], equals: batch.id } },
      }),
    ).toBe(1);
    expect(await (await t.call(`${endpoint}/latest`, { token: f.token })).json()).toMatchObject({
      batch: { id: batch.id },
    });
    expect(await (await t.call(`${endpoint}/latest`, { token: viewer })).json()).toEqual({
      batch: null,
    });
    expect(stub.requests).toHaveLength(0);
    expect((await post(`/${batch.id}/save`)).status).toBe(409);
    expect((await post(`/${batch.id}/retry`)).status).toBe(409);
  });
  it('rejects invalid/oversized requests, missing groups/types and missing batches without writes', async () => {
    const before = await t.prisma.db.botBulkBatch.count({ where: { actorId: f.actor.id } });
    const invalid = await post('', { ...f.input(), delayMinutes: 61 });
    expect(invalid.status).toBe(400);
    expect(
      apiErrorSchema
        .parse(await invalid.json())
        .error.fields?.some((field) => field.path === 'delayMinutes'),
    ).toBe(true);
    expect((await post('', { ...f.input(), fake: true })).status).toBe(400);
    expect((await post('', { ...f.input(), topics: ['x'.repeat(2_000_000)] })).status).toBe(413);
    expect((await post('', f.input({ groupIds: ['missing'] }))).status).toBe(400);
    expect((await post('', f.input({ typeId: 'missing' }))).status).toBe(404);
    expect((await t.call(`${endpoint}/${randomUUID()}`, { token: f.token })).status).toBe(404);
    expect(await t.prisma.db.botBulkBatch.count({ where: { actorId: f.actor.id } })).toBe(before);
  });
  it('requires two enabled personas before creating or queuing a batch', async () => {
    await t.prisma.db.persona.update({ where: { id: f.people[0]! }, data: { enabled: false } });
    try {
      expect((await post('', f.input())).status).toBe(409);
    } finally {
      await t.prisma.db.persona.update({ where: { id: f.people[0]! }, data: { enabled: true } });
    }
  });
  it('persists paged results and selection across restart, then saves only selected scripts exactly once', async () => {
    const response = await post('', f.input({ perTopic: 2, delayMinutes: 6 }));
    const batch = botBulkBatchSchema.parse(await response.json());
    stub.setContent(bulkResponse());
    await f.step(batch.id);
    stub.setContent(bulkResponse());
    await f.step(batch.id);
    const first = await items(batch.id, '?limit=1');
    const second = await items(batch.id, `?limit=1&after=${first.nextCursor}`);
    expect(first.items).toHaveLength(1);
    expect(first.nextCursor).toBe(0);
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
    const a = first.items[0]!;
    const b = second.items[0]!;
    expect((await select(batch.id, [a.id, b.id], false)).status).toBe(200);
    expect((await post(`/${batch.id}/save`)).status).toBe(409);
    expect((await select(batch.id, [b.id], true)).status).toBe(200);
    await t.close();
    t = await createTestApp({ overrides: [[LLM, llm]] });
    f.t = t;
    expect((await items(batch.id)).items.map((item) => item.selected)).toEqual([false, true]);
    const saved = await Promise.all([post(`/${batch.id}/save`), post(`/${batch.id}/save`)]);
    expect(saved.map((r) => r.status)).toEqual([200, 200]);
    const results = await Promise.all(
      saved.map(async (r) => botBulkSavedSchema.parse(await r.json())),
    );
    expect(results.reduce((sum, result) => sum + result.saved, 0)).toBe(1);
    const id = results.flatMap((result) => result.scriptIds)[0]!;
    expect(await t.prisma.db.botScript.findUnique({ where: { id } })).toMatchObject({
      lines: b.lines,
      groupIds: [f.groupId],
      delayMinutes: 6,
      enabled: true,
      runAt: null,
      inviteReal: true,
    });
    expect(
      await t.prisma.db.auditLog.count({
        where: { actorId: f.actor.id, entityId: id, action: 'script.create' },
      }),
    ).toBe(1);
    expect((await select(batch.id, [b.id], false)).status).toBe(409);
    await t.prisma.db.botScript.delete({ where: { id } });
    expect(await (await post(`/${batch.id}/save`)).json()).toEqual({ saved: 0, scriptIds: [] });
    expect(await t.prisma.db.message.count({ where: { roomId: `${f.groupId}-general` } })).toBe(0);
  });
  it('detects a newly saved normalized duplicate and preserves selection until the conflict is resolved', async () => {
    const batch = await f.create();
    const response = bulkResponse();
    stub.setContent(response);
    await f.step(batch.id);
    const item = (await items(batch.id)).items[0]!;
    const manualResponse = await t.call('/admin/scripts', {
      method: 'POST',
      token: f.token,
      json: {
        topic: 'Manual collision',
        groupIds: [f.groupId],
        lines: [{ personaId: f.people[0], body: `${item.lines[0]!.body.toUpperCase()}!!!` }],
        enabled: false,
      },
    });
    expect(manualResponse.status).toBe(201);
    const manual = scriptSchema.parse(await manualResponse.json());
    f.extraScripts.push(manual.id);
    expect((await post(`/${batch.id}/save`)).status).toBe(409);
    expect((await items(batch.id)).items[0]).toMatchObject({ selected: true, savedScriptId: null });
    await t.prisma.db.botScript.delete({ where: { id: manual.id } });
    expect((await post(`/${batch.id}/save`)).status).toBe(200);
  });
  it('rolls back batch/outbox, selection and script inserts when actual audit persistence fails', async () => {
    const control = t.app.get(BotBulkControlService);
    const bad = { ...f.actor, ip: 'invalid-ip' };
    const input = f.input();
    await expect(control.create(bad, input)).rejects.toThrow();
    expect(
      await t.prisma.db.botBulkBatch.count({
        where: { actorId: f.actor.id, requestId: input.requestId },
      }),
    ).toBe(0);
    const batch = await f.create();
    stub.setContent(bulkResponse());
    await f.step(batch.id);
    const item = (await items(batch.id)).items[0]!;
    await expect(
      control.select(bad, batch.id, { itemIds: [item.id], selected: false }),
    ).rejects.toThrow();
    expect((await items(batch.id)).items[0]?.selected).toBe(true);
    const before = await t.prisma.db.botScript.count();
    await expect(control.save(bad, batch.id)).rejects.toThrow();
    expect(await t.prisma.db.botScript.count()).toBe(before);
    expect((await items(batch.id)).items[0]?.savedScriptId).toBeNull();
    expect((await select(batch.id, [item.id, randomUUID()], false)).status).toBe(404);
  });
});
