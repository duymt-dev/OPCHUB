import { expect, type Page } from '../../server/test';
import { ADMIN_URL } from '../../urls';

export async function signInAffiliate(page: Page, origin: string, email: string, password: string) {
  await page.goto(`${origin}/login`);
  await page.locator('input[autocomplete=username], input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  const loginPath =
    new URL(origin).origin === new URL(ADMIN_URL).origin
      ? '/v1/admin/auth/login'
      : '/v1/auth/login';
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.request().method() === 'POST' && new URL(r.url()).pathname === loginPath,
    ),
    page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(),
  ]);
  expect(
    response.status(),
    response.status() === 429
      ? 'Admin login was throttled (429); preserve the production throttle'
      : 'Admin login must succeed before navigation',
  ).toBeGreaterThanOrEqual(200);
  expect(
    response.status(),
    response.status() === 429
      ? 'Login was throttled (429); preserve the production throttle'
      : 'Login must return 2xx before navigation',
  ).toBeLessThan(300);
  await expect(page).not.toHaveURL(/\/login$/);
  await page.goto(`${origin}/affiliate`);
  await expect(
    page.getByRole('heading', { name: 'Mạng lưới Affiliate', exact: true }),
  ).toBeVisible();
}

export async function openAffiliateDetail(page: Page, code: string, name: string) {
  await page.goto(`${ADMIN_URL}/affiliate?tab=aff`);
  await page.getByPlaceholder('Tìm tên, mã giới thiệu, email...').fill(code);
  await page.getByRole('link', { name, exact: true }).click();
}
