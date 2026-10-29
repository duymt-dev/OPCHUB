import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalLlmProvider } from '@opchub/integrations';
import { DEFAULT_BOT_SCHEDULE, botScheduleResponseSchema } from '@opchub/shared/api-domains';
import { LLM } from '@/common/integrations';
import { BotAdmissionService, BotRunnerService } from '@/modules/bot';
import { BotScheduleService } from '@/modules/bot/control/bot-schedule.service';
import { tokenOf } from '../factories/group.factory';
import { createUser } from '../factories/user.factory';
import { llmHttpStub } from '../helpers/llm-http-stub';
import { createTestApp, type TestApp } from '../setup/test-app';
import { generationFixtures, signal } from './generation-fixture';

describe('REQ-607 persisted schedule and linearizable publication pause', () => {
  let t: TestApp;
  let token: string;
  let viewer: string;
  let fixture: ReturnType<typeof generationFixtures>;
  let stub: Awaited<ReturnType<typeof llmHttpStub>>;
  let llm: LocalLlmProvider;
  const now = new Date('2026-10-28T05:00:00Z');
  const endpoint = '/admin/bot/schedule';
  const patch = (json: unknown) => t.call(endpoint, { method: 'PATCH', token, json });

  beforeAll(async () => {
    stub = await llmHttpStub();
    llm = new LocalLlmProvider({
      baseUrl: stub.url,
      model: 'schedule-stub',
      apiKey: 'test-only-key',
    });
    t = await createTestApp({ overrides: [[LLM, llm]] });
    fixture = generationFixtures(t, now);
    await fixture.start();
    token = await tokenOf(
      t,
      await createUser(t, { adminPermissions: ['bots.view', 'bots.action'] }),
    );
    viewer = await tokenOf(t, await createUser(t, { adminPermissions: ['bots.view'] }));
  });
  beforeEach(async () => {
    await t.prisma.db.appSetting.deleteMany({ where: { key: 'bot_schedule' } });
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    await t.prisma.db.appSetting.deleteMany({ where: { key: 'bot_schedule' } });
    await fixture.close();
    await t.close();
    await stub.close();
  });

  it('defaults to live and enforces authentication and action permission without mutation', async () => {
    expect((await t.call(endpoint)).status).toBe(401);
    const read = await t.call(endpoint, { token: viewer });
    expect(read.status).toBe(200);
    expect(botScheduleResponseSchema.parse(await read.json())).toEqual({
      schedule: DEFAULT_BOT_SCHEDULE,
      state: 'live',
    });
    expect(
      (await t.call(endpoint, { method: 'PATCH', token: viewer, json: { paused: true } })).status,
    ).toBe(403);
    expect(await t.prisma.db.appSetting.findUnique({ where: { key: 'bot_schedule' } })).toBeNull();
  });

  it('persists dates/pause, audits each update, and clearing dates never resumes a pause', async () => {
    const before = await t.prisma.db.auditLog.count({ where: { action: 'bot.schedule.update' } });
    expect(
      (await patch({ fromDate: '2026-10-28', toDate: '2026-10-29', paused: true })).status,
    ).toBe(200);
    expect((await patch({ fromDate: null, toDate: null })).status).toBe(200);
    const response = await t.call(endpoint, { token });
    expect(await response.json()).toEqual({
      schedule: { ...DEFAULT_BOT_SCHEDULE, paused: true },
      state: 'paused',
    });
    expect(await t.prisma.db.auditLog.count({ where: { action: 'bot.schedule.update' } })).toBe(
      before + 2,
    );
    expect((await patch({ paused: false })).status).toBe(200);
    expect((await t.app.get(BotScheduleService).get(now)).state).toBe('live');
  });

  it('rejects nonexistent dates, unknown controls and reversed partial ranges with field errors', async () => {
    expect((await patch({ fromDate: '2026-02-29' })).status).toBe(400);
    expect((await patch({ enabled: true })).status).toBe(400);
    expect((await patch({ fromDate: '2026-10-29' })).status).toBe(200);
    const response = await patch({ toDate: '2026-10-28' });
    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).toContain('toDate');
    const state = await t.app.get(BotScheduleService).get(now);
    expect(state.schedule.toDate).toBeNull();
    expect(state.state).toBe('waiting');
  });

  it('rejects oversized input without changing persisted controls', async () => {
    expect((await patch({ fromDate: 'x'.repeat(2_000_000) })).status).toBe(413);
    expect(await t.prisma.db.appSetting.findUnique({ where: { key: 'bot_schedule' } })).toBeNull();
  });

  it('fences queued publication and manual admission, then resumes the unchanged cursor', async () => {
    const { thread, group } = await fixture.thread();
    const runner = t.app.get(BotRunnerService);
    expect((await patch({ paused: true })).status).toBe(200);
    const requests = stub.requests.length;
    expect(await runner.postTurn(thread.id, 0, now)).toBe(false);
    expect(stub.requests).toHaveLength(requests);
    await expect(
      t.app.get(BotAdmissionService).manual({ id: 'unused-actor', ip: null }, 'missing', now),
    ).rejects.toThrow('Bot');
    expect(
      await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: thread.id } }),
    ).toMatchObject({ cursor: 0, status: 'scheduled' });
    expect((await patch({ paused: false })).status).toBe(200);
    expect(await runner.postTurn(thread.id, 0, now)).toBe(true);
    expect(await t.prisma.db.message.count({ where: { roomId: `${group.id}-general` } })).toBe(1);
    expect(stub.requests).toHaveLength(requests + 1);
  });

  it('pause during HTTP generation prevents late publication; resume reuses the durable draft', async () => {
    const { thread, group } = await fixture.thread();
    const started = signal<void>();
    const release = signal<void>();
    const original = llm.generateTurn.bind(llm);
    const generate = vi.spyOn(llm, 'generateTurn').mockImplementationOnce(async (context) => {
      const text = await original(context);
      started.resolve();
      await release.promise;
      return text;
    });
    const runner = t.app.get(BotRunnerService);
    const pending = runner.postTurn(thread.id, 0, now);
    try {
      await started.promise;
      expect((await patch({ paused: true })).status).toBe(200);
    } finally {
      release.resolve();
    }
    expect(await pending).toBe(false);
    expect(await t.prisma.db.message.count({ where: { roomId: `${group.id}-general` } })).toBe(0);
    expect((await patch({ paused: false })).status).toBe(200);
    expect(await runner.postTurn(thread.id, 0, now)).toBe(true);
    expect(generate).toHaveBeenCalledTimes(1);
    generate.mockRestore();
  });

  it('uses inclusive Vietnam dates in persisted policy and fails closed on corrupt values', async () => {
    expect((await patch({ fromDate: '2026-10-28', toDate: '2026-10-29' })).status).toBe(200);
    const schedule = t.app.get(BotScheduleService);
    expect(await schedule.allows(t.prisma.db, new Date('2026-10-27T16:59:59Z'))).toBe(false);
    expect(await schedule.allows(t.prisma.db, new Date('2026-10-27T17:00:00Z'))).toBe(true);
    expect(await schedule.allows(t.prisma.db, new Date('2026-10-29T16:59:59.999Z'))).toBe(true);
    expect(await schedule.allows(t.prisma.db, new Date('2026-10-29T17:00:00Z'))).toBe(false);
    await t.prisma.db.appSetting.update({
      where: { key: 'bot_schedule' },
      data: { value: { paused: 'no' } },
    });
    expect(await schedule.allows(t.prisma.db, now)).toBe(false);
  });
});
