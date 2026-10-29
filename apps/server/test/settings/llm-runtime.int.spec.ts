import type { LlmConfigModel } from '@opchub/db';
import type { LlmProvider } from '@opchub/integrations';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ENV, loadEnv } from '@/common/config';
import { SecretBox } from '@/common/crypto/secret-box';
import { LLM } from '@/common/integrations';
import { LlmConfigCache, LlmRuntimeService } from '@/modules/llm-config';
import { tokenOf } from '../factories/group.factory';
import { createUser } from '../factories/user.factory';
import { llmHttpStub } from '../helpers/llm-http-stub';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('REQ-607 ADR-0008 runtime follows committed Admin configuration', () => {
  let t: TestApp;
  let snapshot: LlmConfigModel | null;
  let token: string;
  let stub: Awaited<ReturnType<typeof llmHttpStub>>;
  let runtime: LlmProvider;
  let independent: LlmRuntimeService;
  const key1 = 'local-key-version-one';
  const key2 = 'local-key-version-two';
  const save = (enabled: boolean, key?: string, model = 'model-one') =>
    t.call('/admin/settings/llm', {
      method: 'PUT',
      token,
      json: { baseUrl: stub.url, enabled, model, key, maxTokens: 128, timeoutMs: 1000 },
    });
  beforeAll(async () => {
    stub = await llmHttpStub();
    t = await createTestApp({
      overrides: [[ENV, { ...loadEnv(), NODE_ENV: 'development', BOT_LLM_PROVIDER: 'fake' }]],
    });
    snapshot = await t.prisma.db.llmConfig.findUnique({ where: { id: 1 } });
    await t.prisma.db.llmConfig.deleteMany();
    await t.redis.client.del('llm:requests:minute');
    token = await tokenOf(t, await createUser(t, { adminPermissions: ['settings.general'] }));
    runtime = t.app.get<LlmProvider>(LLM);
    // Independent process-style cache intentionally has no pub/sub subscription.
    const cache = new LlmConfigCache(t.prisma, t.app.get(SecretBox), t.redis);
    independent = new LlmRuntimeService(cache, t.redis);
  });
  afterAll(async () => {
    if (t) {
      await t.prisma.db.llmConfig.deleteMany();
      if (snapshot) await t.prisma.db.llmConfig.create({ data: snapshot });
      await t.redis.client.del('llm:requests:minute');
      await t.close();
    }
    await stub?.close();
  });
  it('development ignores fake env and unconfigured runtime makes no network call', async () => {
    expect(runtime.name).toBe('admin-configured-llm');
    await expect(runtime.complete('hello')).rejects.toThrow('Chưa cấu hình AI');
    expect(stub.requests).toHaveLength(0);
  });
  it('uses configured endpoint/model/key through the real HTTP adapter', async () => {
    expect((await save(true, key1)).status).toBe(200);
    await expect(runtime.complete('hello')).resolves.toBe('OK from local stub');
    await expect(independent.complete('hello')).resolves.toBe('OK from local stub');
    expect(stub.requests.at(-1)?.authorization).toBe(`Bearer ${key1}`);
    expect(stub.requests.at(-1)?.body).toContain('"model":"model-one"');
  });
  it('rotation and disable fence even a cache that misses all invalidations', async () => {
    expect((await save(true, key2, 'model-two')).status).toBe(200);
    await expect(independent.complete('hello')).resolves.toBe('OK from local stub');
    expect(stub.requests.at(-1)?.authorization).toBe(`Bearer ${key2}`);
    expect(stub.requests.at(-1)?.body).toContain('"model":"model-two"');
    expect((await save(false)).status).toBe(200);
    const count = stub.requests.length;
    await expect(independent.complete('hello')).rejects.toThrow('Chưa cấu hình AI');
    await expect(runtime.complete('hello')).rejects.toThrow('Chưa cấu hình AI');
    expect(stub.requests).toHaveLength(count);
  });
  it('preserves shared request ceiling and never falls back on provider failure', async () => {
    expect((await save(true)).status).toBe(200);
    await t.redis.client.set('llm:requests:minute', '60', 'EX', 60);
    const count = stub.requests.length;
    await expect(runtime.complete('hello')).rejects.toThrow('rate limit');
    expect(stub.requests).toHaveLength(count);
    await t.redis.client.del('llm:requests:minute');
    stub.setMode('unauthorized');
    await expect(runtime.complete('hello')).rejects.toThrow('LLM HTTP 401');
    expect(stub.requests).toHaveLength(count + 1);
  });
});
