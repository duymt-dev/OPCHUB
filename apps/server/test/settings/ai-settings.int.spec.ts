import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { aiSettingsResponseSchema, AI_PROVIDER_IDS } from '@opchub/shared/api-domains';
import { aiDraft, snapshotAi, restoreAi } from '../helpers/ai-config';
import { tokenOf } from '../factories/group.factory';
import { createUser } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
describe('REQ-628 six-provider validation and security', () => {
  let t: TestApp, token: string;
  let previous: Awaited<ReturnType<typeof snapshotAi>>;
  const path = '/admin/settings/ai';
  const body = () => aiDraft('http://127.0.0.1:4999/v1');
  beforeAll(async () => {
    t = await createTestApp();
    previous = await snapshotAi(t);
    token = await tokenOf(t, await createUser(t, { adminPermissions: ['settings.general'] }));
  });
  afterAll(async () => {
    if (t) {
      await restoreAi(t, previous);
      await t.close();
    }
  });
  it('save rejects all disabled, missing key and references to disabled providers', async () => {
    let config = body();
    config.providers = config.providers.map((p) => ({ ...p, enabled: false }));
    const off = await t.call(path, { method: 'PUT', token, json: config });
    expect(off.status).toBe(409);
    expect(await off.json()).toMatchObject({
      error: { message: 'Cần bật ít nhất 1 nhà cung cấp AI' },
    });
    config = body();
    config.providers = config.providers.map((p) => ({ ...p, key: '' }));
    await t.prisma.db.llmProvider.updateMany({ data: { keyEnc: null, enabled: false } });
    expect((await t.call(path, { method: 'PUT', token, json: config })).status).toBe(409);
    expect(
      (await t.call(path, { method: 'PUT', token, json: { ...body(), fallback: 'claude' } }))
        .status,
    ).toBe(400);
    expect((await t.call(path, { method: 'PUT', token, json: body() })).status).toBe(200);
  });
  it('D-124 rejects use.assist and invalid provider ids; obsolete routes removed', async () => {
    expect(
      (
        await t.call(path, {
          method: 'PUT',
          token,
          json: { ...body(), use: { ...body().use, assist: 'custom' } },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await t.call(path + '/providers/nope/verify', {
          method: 'POST',
          token,
          json: { baseUrl: body().providers[5]?.baseUrl, model: 'stub', key: 'key' },
        })
      ).status,
    ).toBe(404);
    expect((await t.call('/admin/settings/llm', { token })).status).toBe(404);
    const result = aiSettingsResponseSchema.parse(await (await t.call(path, { token })).json());
    expect(result.providers).toHaveLength(6);
    expect(result.providers.map((p) => p.id)).toEqual([...AI_PROVIDER_IDS]);
    expect(result.use).not.toHaveProperty('assist');
  });
});
