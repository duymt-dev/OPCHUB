import { expect, test } from '../server/test';
import type { Locator, Page } from '../server/test';
import { ADMIN_URL } from '../urls';

/** TIP-V4-623 (D-89): thanh lọc Thành viên v4 — 7 ô, "N kết quả", "Xóa lọc (n)", trạng thái trên URL */

const rowOf = (page: Page, name: string): Locator =>
  page.locator('[data-m="tbl"] > div > div').filter({ hasText: name }).first();
const select = (page: Page, label: string) =>
  page.locator('label').filter({ hasText: label }).locator('select');

async function openMembers(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.locator('aside').getByText('Thành viên', { exact: true }).click();
  await expect(page.getByText('· 10 tài khoản')).toBeVisible();
}

test.describe('Admin · Thành viên · thanh lọc v4', () => {
  test('đủ 6 ô lọc theo thứ tự prototype v4.2 (D-100: không còn "Khởi đầu")', async ({ page }) => {
    await openMembers(page);
    const labels = [
      'Nhóm cộng đồng',
      'Vai trò khi đăng ký',
      'Phí thành viên',
      'Trạng thái',
      'Hồ sơ',
      'Ngày đăng ký',
    ];
    for (const l of labels) await expect(select(page, l)).toHaveValue('');
    await expect(page.getByLabel('Khởi đầu')).toHaveCount(0);
    // D-107: Phí thành viên = Đã đóng phí · Miễn phí 3 tháng · Chưa đóng / Hết hạn
    await expect(select(page, 'Phí thành viên').locator('option')).toHaveText([
      'Tất cả',
      'Đã đóng phí',
      'Miễn phí 3 tháng',
      'Chưa đóng / Hết hạn',
    ]);
    await expect(page.getByRole('button', { name: /Xóa lọc/ })).toHaveCount(0);
  });

  test('lọc vai trò + trạng thái ghi URL, đếm kết quả, Xóa lọc về đủ 8', async ({ page }) => {
    await openMembers(page);
    await select(page, 'Vai trò khi đăng ký').selectOption({ label: 'Chuyên gia' });
    await expect(page).toHaveURL(/role=expert/);
    await expect(page.getByText('1 kết quả')).toBeVisible();
    await expect(rowOf(page, 'Lê Minh Anh')).toBeVisible();
    await expect(rowOf(page, 'Nguyễn Văn An')).toHaveCount(0);

    await select(page, 'Vai trò khi đăng ký').selectOption({ label: 'Tất cả' });
    await select(page, 'Trạng thái').selectOption({ label: 'Đã khóa' });
    await expect(page).toHaveURL(/st=locked/);
    await expect(rowOf(page, 'Ngô Thành Đạt')).toBeVisible();
    await expect(page.getByText('1 kết quả')).toBeVisible();

    await select(page, 'Phí thành viên').selectOption({ label: 'Chưa đóng / Hết hạn' });
    await expect(page.getByRole('button', { name: 'Xóa lọc (2)' })).toBeVisible();
    await page.getByRole('button', { name: 'Xóa lọc (2)' }).click();
    await expect(page).not.toHaveURL(/st=|fee=/);
    await expect(page.getByText('Hiển thị 1–10 / 10 thành viên')).toBeVisible();
  });
});
