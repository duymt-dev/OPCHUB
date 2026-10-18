import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL, PORTAL_URL } from '../urls';

/** BUG-040 / TD-036: màn đăng nhập không lỗi hydration khi đồng hồ máy khách lệch server */

const SKEW_MS = 3 * 60 * 60 * 1000;

/** React production báo lỗi hydration bằng mã #418 (text khác) / #423 / #425 */
const HYDRATION = /Minified React error #(418|423|425)|Hydration failed|did not match/i;

async function hydrationErrors(page: Page, url: string): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && HYDRATION.test(m.text())) errors.push(m.text());
  });
  await page.clock.install({ time: Date.now() + SKEW_MS });
  await page.goto(url, { waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();
  // Cho effect sau mount chạy (đặt giờ thật + vòng xoay trích dẫn)
  await page.clock.runFor(7_500);
  return errors.filter((m) => HYDRATION.test(m));
}

test.describe('BUG-040 TD-036 hydration màn đăng nhập', () => {
  test('BUG-040 TD-036 /login Portal và Admin với đồng hồ lệch 3 giờ không có React #418', async ({
    browser,
  }) => {
    for (const url of [`${PORTAL_URL}/login`, `${ADMIN_URL}/login`]) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      expect(await hydrationErrors(page, url), url).toEqual([]);
      await ctx.close();
    }
  });
});
