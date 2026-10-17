import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { PORTAL_URL } from '../urls';

/** G3c — P-89 → P-95: Hồ sơ cá nhân (app mới, MSW) */

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });

async function openProfile(page: Page) {
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.getByText('Hồ sơ cá nhân →').click();
  await expect(page.getByRole('button', { name: 'Lưu thay đổi' })).toBeVisible();
}

test.describe('Hồ sơ cá nhân', () => {
  test('lưu thông tin: báo lỗi, hoàn tác, lưu thành công cập nhật tên trên khung', async ({
    page,
  }) => {
    await openProfile(page);
    const name = page.getByPlaceholder('Nguyễn Văn An', { exact: true });
    await name.fill('');
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(toast(page)).toHaveText('Họ và tên không được để trống');

    await page.getByRole('button', { name: 'Hoàn tác' }).click();
    await expect(name).toHaveValue('Nguyễn Văn An');

    await page.getByPlaceholder('ban@congty.vn').fill('sai');
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(toast(page)).toHaveText('Email không hợp lệ');
    await page.getByRole('button', { name: 'Hoàn tác' }).click();

    await name.fill('Nguyễn Văn Bình');
    await page.getByPlaceholder('VD: Hà Nội').fill('Hà Nội');
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(toast(page)).toHaveText('Đã lưu hồ sơ – thông tin trong Admin đã được cập nhật');
    await expect(page.getByRole('heading', { name: 'Nguyễn Văn Bình' })).toBeVisible();
    await expect(page.locator('aside').getByText('Nguyễn Văn Bình')).toBeVisible();
  });

  test('tab trên URL; DN đã xác minh khoá MST (D-40)', async ({ page }) => {
    await openProfile(page);
    await page.getByRole('tab', { name: 'Thông tin doanh nghiệp' }).click();
    await expect(page).toHaveURL(/tab=business/);
    await expect(page.getByTitle(/Doanh nghiệp đã được xác minh/)).toBeVisible();
    const tax = page.getByLabel('Mã số thuế');
    await expect(tax).toHaveValue('0101234567');
    await expect(tax).toHaveAttribute('readonly', '');
    await expect(page.getByLabel('Website')).not.toHaveAttribute('readonly', '');

    await page.getByRole('tab', { name: 'Bảo mật' }).click();
    await expect(page).toHaveURL(/tab=security/);
    await page.getByRole('tab', { name: 'Thông tin cá nhân' }).click();
    await expect(page).not.toHaveURL(/tab=/);
  });

  test('nhóm & hoạt động: bấm số Nhóm, rời nhóm giảm số', async ({ page }) => {
    await openProfile(page);
    await page.getByRole('button', { name: /^3\s*Nhóm$/ }).click();
    await expect(page).toHaveURL(/tab=activity/);
    await expect(page.getByText('Nhóm đã tham gia')).toBeVisible();
    await expect(page.getByText('Workshop: Tự động hoá bán hàng bằng AI')).toBeVisible();
    const row = page
      .locator('div')
      .filter({ hasText: /^HNOPC Hà Nội/ })
      .last();
    await row.getByRole('button', { name: 'Rời nhóm' }).click();
    await expect(toast(page)).toHaveText('Đã rời OPC Hà Nội');
    await expect(page.getByRole('button', { name: /^2\s*Nhóm$/ })).toBeVisible();
  });

  test('bảo mật: đổi mật khẩu, độ mạnh, SSO, đăng xuất thiết bị khác', async ({ page }) => {
    await openProfile(page);
    await page.getByRole('tab', { name: 'Bảo mật' }).click();
    const submit = page.getByRole('button', { name: 'Cập nhật mật khẩu' });
    await submit.click();
    await expect(toast(page)).toHaveText('Nhập mật khẩu hiện tại');

    const pw = page.locator('input[type=password]');
    await pw.nth(0).fill('User@2026');
    await pw.nth(1).fill('abc');
    await expect(page.getByText('Rất yếu')).toBeVisible();
    await submit.click();
    await expect(toast(page)).toHaveText('Mật khẩu mới chưa đủ mạnh');

    await pw.nth(1).fill('Opchub@2026');
    await expect(page.getByText('Mạnh', { exact: true })).toBeVisible();
    await pw.nth(2).fill('khac');
    await submit.click();
    await expect(toast(page)).toHaveText('Xác nhận mật khẩu không khớp');
    await pw.nth(2).fill('Opchub@2026');
    await submit.click();
    await expect(toast(page)).toHaveText('Đã cập nhật mật khẩu');
    await expect(pw.nth(0)).toHaveValue('');

    const fb = page
      .locator('div')
      .filter({ hasText: /^Facebook/ })
      .last();
    await fb.getByRole('button', { name: 'Liên kết' }).click();
    await expect(toast(page)).toHaveText('Đã liên kết Facebook');
    await expect(fb.getByText('Đã liên kết')).toBeVisible();

    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).last().click();
    await expect(toast(page)).toHaveText('Đã đăng xuất khỏi 2 thiết bị khác');
  });
});
