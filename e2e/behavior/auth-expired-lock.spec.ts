import { expect, test } from '../server/test';
import { ADMIN_URL, PORTAL_URL } from '../urls';
import { meSchema } from '@opchub/shared/api';
import { expireDemoLock } from './helpers/expired-lock';

test('BR-465 expired timed lock allows a real login and returns active /me', async ({ page }) => {
  await page.clock.install({ time: new Date() });
  await page.goto(`${ADMIN_URL}/login`);
  await page
    .locator('input[autocomplete=username],input[type=email]')
    .fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  const login = page.waitForResponse((r) => new URL(r.url()).pathname === '/v1/admin/auth/login');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const session = (await (await login).json()) as { accessToken: string };
  const locked = await page.evaluate(async (token) => {
    const response = await fetch('/v1/admin/users/m1/status', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'locked', days: 1, reason: 'BR-465 expired-lock acceptance' }),
    });
    return response.status;
  }, session.accessToken);
  expect(locked).toBe(200);
  await page.goto(`${PORTAL_URL}/login`);
  await page
    .locator('input[autocomplete=username],input[type=email]')
    .fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill('User@2026');
  const refused = page.waitForResponse((r) => new URL(r.url()).pathname === '/v1/auth/login');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  expect((await refused).status()).toBe(403);
  await expect(page).toHaveURL(/\/login$/);
  await expireDemoLock(page);
  const accepted = page.waitForResponse((r) => new URL(r.url()).pathname === '/v1/auth/login');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const response = await accepted;
  expect(response.status()).toBe(200);
  const current = (await response.json()) as { me: unknown; accessToken: string };
  expect(meSchema.parse(current.me)).toMatchObject({ id: 'm1', status: 'active' });
  await expect(page).not.toHaveURL(/\/login$/);
  const me = await page.evaluate(async (token) => {
    const result = await fetch('/v1/me', { headers: { authorization: `Bearer ${token}` } });
    return { status: result.status, body: (await result.json()) as unknown };
  }, current.accessToken);
  expect(me.status).toBe(200);
  expect(meSchema.parse(me.body)).toMatchObject({ id: 'm1', status: 'active' });
});
