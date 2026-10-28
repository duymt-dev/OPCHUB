import { randomUUID } from 'node:crypto';
import { LocalLlmProvider } from '@opchub/integrations';
import { apiErrorSchema } from '@opchub/shared/api';
import { botSettingsSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LLM } from '@/common/integrations';
import { BotRunnerService } from '@/modules/bot';
import { tokenOf } from '../factories/group.factory';
import { createUser } from '../factories/user.factory';
import { llmHttpStub } from '../helpers/llm-http-stub';
import { createTestApp, type TestApp } from '../setup/test-app';
import { generationFixtures } from './generation-fixture';

describe('D-112 actual minute-gap publication boundaries', () => {
  let t: TestApp;
  let fixture: ReturnType<typeof generationFixtures>;
  let stub: Awaited<ReturnType<typeof llmHttpStub>>;
  let token: string;
  const scripts: string[] = [];
  const now = new Date('2026-10-29T05:00:00Z');
  beforeAll(async () => {
    stub = await llmHttpStub();
    t = await createTestApp({
      overrides: [
        [
          LLM,
          new LocalLlmProvider({
            baseUrl: stub.url,
            model: 'minute-gap-test',
            apiKey: 'test-only-key',
          }),
        ],
      ],
    });
    fixture = generationFixtures(t, now);
    await fixture.start();
    token = await tokenOf(
      t,
      await createUser(t, { adminPermissions: ['bots.view', 'bots.action'] }),
    );
  });
  beforeEach(async () => {
    await fixture.enabled(true);
  });
  afterAll(async () => {
    await fixture.close();
    await t.prisma.db.botScript.deleteMany({ where: { id: { in: scripts } } });
    await t.close();
    await stub.close();
  });

  it.each([1, 6, 60])(
    'stored script respects exactly %s minutes, rejecting publication one millisecond early',
    async (minutes) => {
      const { thread, group, people } = await fixture.thread();
      const scriptId = randomUUID();
      scripts.push(scriptId);
      const lines = people.map((p) => ({ personaId: p.id, body: `Stored turn ${p.id}` }));
      await t.prisma.db.botScript.create({
        data: {
          id: scriptId,
          topic: 'Minute gap',
          groupIds: [group.id],
          lines,
          delayMinutes: minutes,
        },
      });
      await t.prisma.db.botThread.update({
        where: { id: thread.id },
        data: {
          scriptId,
          kind: 'script',
          isAuto: false,
          lines,
          personaQueue: people.map((p) => p.id),
        },
      });
      const runner = t.app.get(BotRunnerService);
      expect(await runner.postTurn(thread.id, 0, now)).toBe(true);
      const next = await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: thread.id } });
      const deadline = new Date(now.getTime() + minutes * 60000);
      expect(next.nextAt).toEqual(deadline);
      expect(await runner.postTurn(thread.id, 0, now)).toBe(false);
      expect(await runner.postTurn(thread.id, 1, new Date(deadline.getTime() - 1))).toBe(false);
      expect(await t.prisma.db.message.count({ where: { botThreadId: thread.id } })).toBe(1);
      expect(await runner.postTurn(thread.id, 1, deadline)).toBe(true);
      expect(await t.prisma.db.message.count({ where: { botThreadId: thread.id } })).toBe(2);
      expect(stub.requests).toHaveLength(0);
    },
  );

  it.each([6, 60])(
    'real-HTTP generated conversation respects global %s-minute spacing',
    async (minutes) => {
      const { thread } = await fixture.thread();
      const current = botSettingsSchema.parse(
        (await t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'bot' } })).value,
      );
      await t.prisma.db.appSetting.update({
        where: { key: 'bot' },
        data: { value: { ...current, delayMinutes: minutes } },
      });
      const before = stub.requests.length;
      const runner = t.app.get(BotRunnerService);
      expect(await runner.postTurn(thread.id, 0, now)).toBe(true);
      expect(stub.requests.length - before).toBe(1);
      const deadline = new Date(now.getTime() + minutes * 60000);
      expect(
        (await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: thread.id } })).nextAt,
      ).toEqual(deadline);
      expect(await runner.postTurn(thread.id, 1, new Date(deadline.getTime() - 1))).toBe(false);
      expect(stub.requests.length - before).toBe(1);
      expect(await runner.postTurn(thread.id, 1, deadline)).toBe(true);
      expect(stub.requests.length - before).toBe(2);
      expect(
        await t.prisma.db.message.count({
          where: { botThreadId: thread.id, body: 'OK from local stub' },
        }),
      ).toBe(2);
    },
  );

  it('HTTP settings rejects the obsolete61–120 range with fields and preserves the current value', async () => {
    const before = (await t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'bot' } }))
      .value;
    const response = await t.call('/admin/bot/settings', {
      method: 'PATCH',
      token,
      json: { delayMinutes: 61 },
    });
    expect(response.status).toBe(400);
    const error = apiErrorSchema.parse(await response.json()).error;
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.fields?.map((field) => field.path)).toContain('delayMinutes');
    expect(
      (await t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'bot' } })).value,
    ).toEqual(before);
    const valid = await t.call('/admin/bot/settings', {
      method: 'PATCH',
      token,
      json: { delayMinutes: 60 },
    });
    expect(valid.status).toBe(200);
    expect(botSettingsSchema.parse(await valid.json()).delayMinutes).toBe(60);
  });
});
