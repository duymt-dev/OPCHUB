import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { PORTAL_URL } from '../urls';

/**
 * V4-613 REQ-513 (QT-13, AD-09): Trợ lý OPC Hub ở chân sidebar Portal — đóng / mở (nhớ sau tải lại),
 * chỉ mục danh mục đang bật, "Đăng ký tư vấn" mở form của đúng dịch vụ, "Xem tất cả" mở popup;
 * sidebar thu gọn ẩn khung, mobile nằm trong drawer.
 */

async function login(page: Page) {
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

const box = (page: Page) => page.locator('aside').getByRole('region', { name: 'Trợ lý OPC Hub' });
const popup = (page: Page) => page.getByRole('dialog', { name: 'Gói dịch vụ' });

test.describe('Trợ lý OPC Hub', () => {
  test('mở danh mục đang bật → đăng ký tư vấn đúng dịch vụ; nhớ trạng thái; Xem tất cả', async ({
    page,
  }) => {
    await login(page);
    await expect(box(page)).toBeVisible();
    await expect(box(page)).not.toContainText('Kết nối nguồn vốn');
    await box(page).getByRole('button', { name: 'Mở Trợ lý OPC Hub' }).click();
    await expect(box(page).locator('[data-service]')).toHaveCount(10);
    await expect(box(page)).not.toContainText('Marketing số theo tháng');

    await page.reload({ waitUntil: 'networkidle' });
    await expect(box(page).getByRole('button', { name: 'Thu gọn Trợ lý OPC Hub' })).toBeVisible();

    const fund = box(page).locator('[data-service="fund"]');
    await fund.getByRole('button', { name: /Kết nối nguồn vốn/ }).click();
    await fund.getByRole('button', { name: 'Đăng ký tư vấn' }).click();
    await expect(page).toHaveURL(/\/services\/fund\/request$/);
    await expect(popup(page).getByText('Đăng ký tư vấn dịch vụ')).toBeVisible();
    await expect(popup(page).getByRole('combobox', { name: 'Dịch vụ quan tâm' })).toHaveValue(
      'fund',
    );
    await page.keyboard.press('Escape');

    await page.goto(`${PORTAL_URL}/dashboard`, { waitUntil: 'networkidle' });
    await box(page).getByRole('button', { name: 'Xem tất cả dịch vụ →' }).click();
    await expect(page).toHaveURL(/\/services$/);
    await expect(popup(page)).toBeVisible();
  });

  test('sidebar thu gọn ẩn khung; mobile 390 khung nằm trong drawer', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Thu gọn sidebar' }).click();
    await expect(box(page)).toBeHidden();
    await page.getByRole('button', { name: 'Mở rộng sidebar' }).click();
    await expect(box(page)).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(page.locator('aside')).toHaveAttribute('data-open', 'true');
    await box(page).scrollIntoViewIfNeeded();
    await expect(box(page)).toBeVisible();
  });
});
