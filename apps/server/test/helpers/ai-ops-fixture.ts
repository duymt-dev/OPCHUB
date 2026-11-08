import { afterAll, beforeAll, beforeEach } from 'vitest';
import { AiRouterService, AiSettingsService } from '@/modules/llm-config';
import { aiMonth } from '@/modules/llm-config/services/ai-budget.service';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { aiDraft, restoreAi, snapshotAi } from './ai-config';
import { llmHttpStub } from './llm-http-stub';
import type { AiSettingsUpdate } from '@opchub/shared/api-domains';

const redisKeys = (month: string) => [
  'llm:requests:minute',
  `llm:reserved:${month}`,
  `llm:reservations:${month}`,
  `llm:spend:${month}`,
  `llm:spend:${month}:epoch`,
];
async function restoreRows(
  t: TestApp,
  state: Awaited<ReturnType<typeof snapshotAi>>,
  usage: Awaited<ReturnType<TestApp['prisma']['db']['llmUsageMonth']['findUnique']>>,
  month: string,
  model: string,
  started: Date,
) {
  await restoreAi(t, state);
  await t.prisma.db.llmCall.deleteMany({ where: { model: { startsWith: model } } });
  await t.prisma.db.outboxEvent.deleteMany({
    where: {
      type: { in: ['ai.budget_warned', 'ai.budget_exhausted'] },
      createdAt: { gte: started },
    },
  });
  await t.prisma.db.llmUsageMonth.deleteMany({ where: { month } });
  if (usage) await t.prisma.db.llmUsageMonth.create({ data: usage });
  await t.redis.client.del(...redisKeys(month));
  await t.close();
}

function resetStub(stub: Awaited<ReturnType<typeof llmHttpStub>>) {
  stub.setMode('ok');
  stub.setUsage(undefined);
  stub.setDelay(0);
}

/** Exclusive integration project; restore only this suite's monthly/config fixtures. */
export function aiOpsFixture(model: string, options?: Parameters<typeof createTestApp>[0]) {
  let t: TestApp;
  let a: Awaited<ReturnType<typeof llmHttpStub>>;
  let b: typeof a;
  let state: Awaited<ReturnType<typeof snapshotAi>>;
  let usage: Awaited<ReturnType<TestApp['prisma']['db']['llmUsageMonth']['findUnique']>>;
  let actor: { id: string; ip: null };
  const month = aiMonth();
  const started = new Date();
  const finalizers: (() => Promise<void>)[] = [];
  const save = (patch: Partial<AiSettingsUpdate> = {}) => {
    const draft = aiDraft(a.url, 'test-ai-817-primary', model);
    draft.use = { bot: 'custom', script: 'custom', content: 'custom', mod: 'custom' };
    draft.providers = draft.providers.map((p) =>
      p.id === 'usgate'
        ? {
            ...p,
            enabled: true,
            key: 'test-ai-817-fallback',
            baseUrl: b.url,
            model: `${model}-fallback`,
          }
        : p,
    );
    return t.app.get(AiSettingsService).save(actor, { ...draft, ...patch });
  };
  beforeAll(async () => {
    a = await llmHttpStub();
    b = await llmHttpStub();
    t = await createTestApp(options);
    await flushAuthState(t);
    state = await snapshotAi(t);
    usage = await t.prisma.db.llmUsageMonth.findUnique({ where: { month } });
    actor = {
      id: (await createUser(t, { adminPermissions: ['settings.general', 'settings.mail'] })).id,
      ip: null,
    };
  });
  beforeEach(async () => {
    await flushAuthState(t);
    resetStub(a);
    resetStub(b);
    await t.prisma.db.llmUsageMonth.deleteMany({ where: { month } });
    await t.redis.client.del(...redisKeys(month));
    await save();
  });
  afterAll(async () => {
    await Promise.all(finalizers.map((finish) => finish()));
    if (t) await restoreRows(t, state, usage, month, model, started);
    await a?.close();
    await b?.close();
  });
  return {
    get t() {
      return t;
    },
    get a() {
      return a;
    },
    get b() {
      return b;
    },
    get actor() {
      return actor;
    },
    get router() {
      return t.app.get(AiRouterService);
    },
    month,
    model,
    started,
    save,
    cleanup: (finish: () => Promise<void>) => {
      finalizers.push(finish);
    },
  };
}
