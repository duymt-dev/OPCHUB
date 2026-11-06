import { adminLoginResponseSchema } from '@opchub/shared/api';
import {
  AI_PROVIDER_IDS,
  AI_PROVIDER_CATALOG,
  DEFAULT_AI_SETTINGS,
} from '@opchub/shared/api-domains';
import { expect, type Page } from '../server/test';
import { ADMIN_URL } from '../urls';
export async function settingsLogin(page: Page) {
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  const response = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/admin/auth/login' && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const result = adminLoginResponseSchema.parse(await (await response).json());
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  return result.accessToken;
}
/** Identical fixture through each mode's API; no interception or assertion branches. */
export async function settingsFixture(
  page: Page,
  token: string,
  path: string,
  body: unknown,
  method: 'PUT' | 'PATCH',
) {
  const status = await page.evaluate(
    async ({ token, path, body, method }) => {
      const r = await fetch(`/v1/admin/settings/${path}`, {
        method,
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      return r.status;
    },
    { token, path, body, method },
  );
  expect(status).toBe(200);
}
export function aiBrowserFixture(baseUrl: string) {
  return {
    ...DEFAULT_AI_SETTINGS,
    budget: 0,
    use: { bot: 'custom', script: 'custom', content: '', mod: '' },
    fallback: '',
    providers: AI_PROVIDER_IDS.map((id) => ({
      id,
      enabled: id === 'custom',
      baseUrl: id === 'custom' ? baseUrl : AI_PROVIDER_CATALOG[id].baseUrl,
      model: id === 'custom' ? 'browser-local-model' : (AI_PROVIDER_CATALOG[id].models[0] ?? ''),
      key: id === 'custom' ? 'browser-test-key-0000' : '',
      priceIn: 0,
      priceOut: 0,
    })),
  };
}
