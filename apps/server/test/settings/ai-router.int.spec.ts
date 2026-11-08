import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ENV, loadEnv } from '@/common/config';
import { AiRouterService } from '@/modules/llm-config';
import { aiMonth } from '@/modules/llm-config/services/ai-budget.service';
import { AiSettingsService } from '@/modules/llm-config';
import { aiDraft, snapshotAi, restoreAi } from '../helpers/ai-config';
import { llmHttpStub } from '../helpers/llm-http-stub';
import { createUser } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import type { AiSettingsUpdate } from '@opchub/shared/api-domains';
describe('REQ-628 multi-provider runtime through actual HTTP', () => {
  let t: TestApp;
  let a: Awaited<ReturnType<typeof llmHttpStub>>;
  let b: typeof a;
  let snapshot: Awaited<ReturnType<typeof snapshotAi>>;
  let usage: Awaited<ReturnType<TestApp['prisma']['db']['llmUsageMonth']['findUnique']>>;
  let actor: { id: string; ip: null };
  let router: AiRouterService;
  const model = 'TIP811-router';
  const month = aiMonth();
  const save = (patch: Partial<AiSettingsUpdate> = {}) => {
    const config = aiDraft(a.url, 'test-primary-key', model);
    config.providers = config.providers.map((p) =>
      p.id === 'usgate'
        ? { ...p, enabled: true, baseUrl: b.url, model, key: 'test-fallback-key' }
        : p,
    );
    return t.app.get(AiSettingsService).save(actor, { ...config, fallback: 'usgate', ...patch });
  };
  beforeAll(async () => {
    a = await llmHttpStub();
    b = await llmHttpStub();
    t = await createTestApp({ overrides: [[ENV, { ...loadEnv(), NODE_ENV: 'development' }]] });
    snapshot = await snapshotAi(t);
    usage = await t.prisma.db.llmUsageMonth.findUnique({ where: { month } });
    actor = { id: (await createUser(t, { adminPermissions: ['settings.general'] })).id, ip: null };
    router = t.app.get(AiRouterService);
  });
  beforeEach(async () => {
    a.setMode('ok');
    b.setMode('ok');
    a.setUsage(undefined);
    b.setUsage(undefined);
    await t.prisma.db.llmUsageMonth.deleteMany({ where: { month } });
    await t.prisma.db.llmCall.deleteMany({ where: { model } });
    await t.redis.client.del(
      'llm:requests:minute',
      `llm:spend:${month}`,
      `llm:spend:${month}:epoch`,
    );
    await save();
  });
  afterAll(async () => {
    if (t) {
      await restoreAi(t, snapshot);
      await t.prisma.db.llmCall.deleteMany({ where: { model } });
      await t.prisma.db.llmUsageMonth.deleteMany({ where: { month } });
      if (usage) await t.prisma.db.llmUsageMonth.create({ data: usage });
      await t.redis.client.del(`llm:spend:${month}`, `llm:spend:${month}:epoch`);
      await t.close();
    }
    await a?.close();
    await b?.close();
  });
  it('route by purpose, temperature and max tokens reach distinct stubs', async () => {
    await save({
      use: { bot: 'custom', script: 'usgate', content: '', mod: '' },
      temperature: 0.7,
      maxTokens: 32,
    });
    const an = a.requests.length,
      bn = b.requests.length;
    await router.forPurpose('bot').complete('hello', { maxTokens: 1024 });
    await router.forPurpose('script').complete('script');
    expect(a.requests).toHaveLength(an + 1);
    expect(b.requests).toHaveLength(bn + 1);
    expect(JSON.parse(a.requests.at(-1)?.body ?? '')).toMatchObject({
      temperature: 0.7,
      max_tokens: 32,
    });
    expect(
      await t.prisma.db.llmCall.findMany({
        where: { model },
        select: { purpose: true, provider: true },
        orderBy: { createdAt: 'asc' },
      }),
    ).toEqual([
      { purpose: 'bot', provider: 'custom' },
      { purpose: 'script', provider: 'usgate' },
    ]);
    await expect(router.forPurpose('content').complete('x')).rejects.toThrow('Chức năng chưa chọn');
  });
  it.each(['unavailable', 'rate'] as const)(
    'fallback once on retryable %s, never on401',
    async (mode) => {
      a.setMode(mode);
      const bn = b.requests.length;
      await router.forPurpose('bot').complete('hello');
      expect(b.requests).toHaveLength(bn + 1);
      expect(
        (
          await t.prisma.db.llmCall.findMany({
            where: { model },
            orderBy: { createdAt: 'asc' },
            select: { status: true },
          })
        ).map((r) => r.status),
      ).toEqual(['error', 'fallback']);
      a.setMode('unauthorized');
      await expect(router.forPurpose('bot').complete('hello')).rejects.toThrow('HTTP 401');
      expect(b.requests).toHaveLength(bn + 1);
      a.setMode(mode);
      await t.redis.client.set('llm:requests:minute', '59', 'EX', 60);
      await expect(router.forPurpose('bot').complete('ceiling')).rejects.toThrow('rate limit');
      expect(b.requests).toHaveLength(bn + 1);
    },
  );
  it('budget: exact25 VND, durable totals even with log false, bot stops and script uses fallback', async () => {
    const config = aiDraft(a.url, 'test-primary-key', model);
    const providers = config.providers.map((p) =>
      p.id === 'custom'
        ? { ...p, priceIn: 20000, priceOut: 10000 }
        : p.id === 'usgate'
          ? { ...p, enabled: true, baseUrl: b.url, model, key: 'test-fallback-key' }
          : p,
    );
    await save({ providers, budget: 50 });
    a.setUsage({ prompt_tokens: 1000, completion_tokens: 500 });
    await router.forPurpose('bot').complete('first');
    await router.forPurpose('bot').complete('second');
    expect((await t.prisma.db.llmUsageMonth.findUniqueOrThrow({ where: { month } })).cost).toBe(
      50n,
    );
    await expect(router.forPurpose('bot').complete('stop')).rejects.toThrow(
      'Hết ngân sách AI tháng',
    );
    const bn = b.requests.length;
    await router.forPurpose('script').complete('fallback');
    expect(b.requests).toHaveLength(bn + 1);
    await save({ providers, budget: 0, log: false });
    const logs = await t.prisma.db.llmCall.count({ where: { model } });
    await router.forPurpose('bot').complete('unlimited');
    expect(await t.prisma.db.llmCall.count({ where: { model } })).toBe(logs);
    expect((await t.prisma.db.llmUsageMonth.findUniqueOrThrow({ where: { month } })).cost).toBe(
      75n,
    );
  });
  it('pii: all outbound context is masked, switch off preserves original; no prompt in call rows', async () => {
    const secret = '0912 345 678 a.b@x.vn 1203132809 TV000123';
    const context = {
      topic: secret,
      persona: { id: 'ps', name: secret, tone: 'friendly', skills: '' },
      history: [{ personaId: null, body: secret }],
    };
    await router.forPurpose('bot').generateTurn(context);
    const body = a.requests.at(-1)?.body ?? '';
    expect(body).not.toContain('0912');
    expect(body).not.toContain('a.b@x.vn');
    expect(body).toContain('TV000123');
    await save({ pii: false });
    await router.forPurpose('bot').generateTurn(context);
    expect(a.requests.at(-1)?.body).toContain(secret);
    const rows = await t.prisma.db.llmCall.findMany({ where: { model } });
    expect(
      JSON.stringify(rows, (_, v: unknown) => (typeof v === 'bigint' ? v.toString() : v)),
    ).not.toContain(secret);
  });
});
