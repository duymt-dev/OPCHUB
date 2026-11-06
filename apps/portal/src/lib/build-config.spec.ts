import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl/plugin', () => ({ default: () => (config: unknown) => config }));
beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllEnvs());

describe('TIP-V46-804-F1 build API isolation', () => {
  it('MSW never proxies an unhandled request to an inherited real API', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_MOCKING', 'msw');
    vi.stubEnv('API_PROXY_URL', 'http://127.0.0.1:4999');
    const { default: config } = await import('../../next.config');
    expect(await config.rewrites?.()).toEqual([]);
  });
  it('native mode keeps the explicitly configured API proxy', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_MOCKING', 'off');
    vi.stubEnv('API_PROXY_URL', 'http://127.0.0.1:4999');
    vi.stubEnv('API_INTERNAL_URL', 'http://127.0.0.1:4999/v1');
    const { default: config } = await import('../../next.config');
    expect(await config.rewrites?.()).toEqual([
      { source: '/v1/:path*', destination: 'http://127.0.0.1:4999/v1/:path*' },
    ]);
  });
  it('REQ-627 native SSR requires its server-only internal API URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_MOCKING', 'off');
    vi.stubEnv('API_INTERNAL_URL', '');
    await expect(import('../../next.config')).rejects.toThrow('API_INTERNAL_URL');
  });
});
