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

  test('REQ-514 REQ-515 D-80 D-73 menu §27.3: nhóm v4, không Marketing, Cài đặt ở menu người dùng', async ({
    page,
  }) => {
    await login(page);
    const nav = page.locator('aside nav');
    await expect(nav.getByRole('link')).toHaveText([
      'Tổng quan',
      'Thành viên',
      'Phí thành viên',
      /^Nhóm cộng đồng/,
      'Bot tương tác',
      'Nội dung & Sự kiện',
      'Nhu cầu địa phương',
      'Gian hàng',
      /^Dự án OPC/,
      'Nhà đầu tư',
      /^Dịch vụ/,
      'Mạng lưới Affiliate',
    ]);
    for (const h of ['NGƯỜI DÙNG & CỘNG ĐỒNG', 'KẾT NỐI KINH DOANH', 'DOANH THU & ĐỐI TÁC']) {
      await expect(nav.getByText(h, { exact: true })).toBeVisible();
    }
    await expect(page.locator('aside').getByText('Sự kiện sắp tới')).toHaveCount(0);
    await page.locator('[data-m="me"]').click();
    await page.getByRole('menuitem', { name: 'Cài đặt hệ thống' }).click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole('heading', { name: 'Cài đặt hệ thống' })).toBeVisible();
  });
});
