import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL } from '../urls';

/** BUG-027 (CR-47, DV-06): khung Admin — nút thu gọn sidebar 248 ↔ 76px, nhớ trong localStorage */

async function login(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await signIn(page);
}

/** Phiên MSW không qua được tải lại trang (cookie refresh giả) → đăng nhập lại, storage còn nguyên */
async function signIn(page: Page) {
  await page.locator('input[type=email]').fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await expect(page.locator('aside')).toBeVisible();
}

test.describe('Admin · khung ứng dụng', () => {
  test('BUG-027 thu gọn sidebar Admin 76px, nhớ sau tải lại', async ({ page }) => {
    await login(page);
    const aside = page.locator('aside');
    await expect(aside).toHaveCSS('width', '248px');

    await page.getByRole('button', { name: 'Thu gọn sidebar' }).click();
    await expect(aside).toHaveCSS('width', '76px');
    expect(await page.evaluate(() => localStorage.getItem('opc-sb-mini'))).toBe('1');

    await page.reload({ waitUntil: 'networkidle' });
    if (new URL(page.url()).pathname.startsWith('/login')) await signIn(page);
    await expect(page.locator('aside')).toHaveCSS('width', '76px');

    await page.getByRole('button', { name: 'Mở rộng sidebar' }).click();
    await expect(page.locator('aside')).toHaveCSS('width', '248px');
    expect(await page.evaluate(() => localStorage.getItem('opc-sb-mini'))).toBe('0');
  });
});
