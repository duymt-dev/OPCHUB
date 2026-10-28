import { llmConfigSchema, llmConfigVerifyResultSchema } from '@opchub/shared/api-domains';
import { resetMockDb } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { resetMockLlmConfig } from './handlers/llm-config';

const server = setupServer(...handlers);
const path = `${location.origin}/v1/admin/settings/llm`;
const draft = {
  baseUrl: 'http://127.0.0.1:4999/v1',
  model: 'stub-model',
  enabled: true,
  maxTokens: 128,
  timeoutMs: 1000,
};
const send = (method: string, body?: unknown, token = 'mock.admin', suffix = '') =>
  fetch(path + suffix, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  resetMockDb();
  resetMockLlmConfig();
});
afterAll(() => server.close());

describe('REQ-607 MSW Admin AI settings', () => {
  it('starts unconfigured, persists masked response, retains key and disables', async () => {
    expect(llmConfigSchema.parse(await (await send('GET')).json()).configured).toBe(false);
    const key = 'not-a-real-secret-key';
    const saved = llmConfigSchema.parse(await (await send('PUT', { ...draft, key })).json());
    expect(saved).toMatchObject({ configured: true, hasKey: true, keyLast4: '-key' });
    expect(JSON.stringify(saved)).not.toContain(key);
    expect(sessionStorage.getItem('opchub-mock-llm-config')).not.toContain(key);
    expect(llmConfigSchema.parse(await (await send('PUT', draft)).json()).keyLast4).toBe('-key');
    const verified = llmConfigVerifyResultSchema.parse(
      await (await send('POST', draft, 'mock.admin', '/verify')).json(),
    );
    expect(verified.ok).toBe(true);
    const disabled = llmConfigSchema.parse(
      await (await send('PUT', { ...draft, enabled: false })).json(),
    );
    expect(disabled).toMatchObject({ configured: false, hasKey: true });
  });
  it('matches permission, missing-key and input failures of native API', async () => {
    expect((await send('GET', undefined, 'mock.adm-mai')).status).toBe(403);
    expect((await send('PUT', draft)).status).toBe(409);
    expect((await send('PUT', { ...draft, baseUrl: 'http://remote.example' })).status).toBe(400);
    expect((await send('POST', draft, 'mock.admin', '/verify')).status).toBe(201);
    expect(
      llmConfigVerifyResultSchema.parse(
        await (await send('POST', draft, 'mock.admin', '/verify')).json(),
      ).ok,
    ).toBe(false);
  });
});
