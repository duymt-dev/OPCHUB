import {
  aiSettingsResponseSchema,
  aiVerifyResultSchema,
  AI_PROVIDER_IDS,
  AI_PROVIDER_CATALOG,
  DEFAULT_AI_SETTINGS,
} from '@opchub/shared/api-domains';
import { resetMockDb } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { resetMockAiProviders } from './handlers/ai-providers';

const server = setupServer(...handlers);
const path = `${location.origin}/v1/admin/settings/ai`;
const draft = {
  ...DEFAULT_AI_SETTINGS,
  use: { bot: 'custom', script: 'custom', content: '', mod: '' },
  fallback: '',
  providers: AI_PROVIDER_IDS.map((id) => ({
    id,
    enabled: id === 'custom',
    baseUrl: id === 'custom' ? 'http://127.0.0.1:4999/v1' : AI_PROVIDER_CATALOG[id].baseUrl,
    model: id === 'custom' ? 'stub-model' : (AI_PROVIDER_CATALOG[id].models[0] ?? ''),
    priceIn: 0,
    priceOut: 0,
  })),
};
const withKey = (key: string) => ({
  ...draft,
  providers: draft.providers.map((p) => (p.id === 'custom' ? { ...p, key } : p)),
});
const custom = (r: unknown) =>
  aiSettingsResponseSchema.parse(r).providers.find((p) => p.id === 'custom');
const verify = { baseUrl: 'http://127.0.0.1:4999/v1', model: 'stub-model' };
const send = (method: string, body?: unknown, token = 'mock.admin', suffix = '') =>
  fetch(path + suffix, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  resetMockDb();
  resetMockAiProviders();
});
afterAll(() => server.close());

describe('REQ-607 MSW Admin AI settings', () => {
  it('starts unconfigured, persists masked response, retains key and disables', async () => {
    expect(custom(await (await send('GET')).json())?.enabled).toBe(false);
    const key = 'not-a-real-secret-key';
    const saved = aiSettingsResponseSchema.parse(await (await send('PUT', withKey(key))).json());
    expect(custom(saved)).toMatchObject({ enabled: true, hasKey: true, keyLast4: '-key' });
    expect(JSON.stringify(saved)).not.toContain(key);
    expect(sessionStorage.getItem('opchub-mock-ai-providers')).not.toContain(key);
    expect(custom(await (await send('PUT', draft)).json())?.keyLast4).toBe('-key');
    const verified = aiVerifyResultSchema.parse(
      await (await send('POST', verify, 'mock.admin', '/providers/custom/verify')).json(),
    );
    expect(verified.ok).toBe(true);
    const disabled = aiSettingsResponseSchema.parse(
      await (
        await send('PUT', {
          ...draft,
          use: { bot: '', script: '', content: '', mod: '' },
          providers: withKey('unused-key').providers.map((p) =>
            p.id === 'custom'
              ? { ...p, enabled: false }
              : p.id === 'openai'
                ? { ...p, enabled: true, key: 'unused-key' }
                : p,
          ),
        })
      ).json(),
    );
    expect(custom(disabled)).toMatchObject({ enabled: false, hasKey: true });
  });
  it('matches permission, missing-key and input failures of native API', async () => {
    expect((await send('GET', undefined, 'mock.adm-mai')).status).toBe(403);
    expect((await send('PUT', draft)).status).toBe(409);
    expect(
      (
        await send('PUT', {
          ...draft,
          providers: draft.providers.map((p) => ({ ...p, baseUrl: 'http://remote.example' })),
        })
      ).status,
    ).toBe(400);
    expect((await send('POST', verify, 'mock.admin', '/providers/custom/verify')).status).toBe(400);
    expect(
      await (await send('POST', verify, 'mock.admin', '/providers/custom/verify')).json(),
    ).toMatchObject({ error: { message: 'Vui lòng nhập API key' } });
  });
});
