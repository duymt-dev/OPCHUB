import { expect, test } from '../server/test';
import { ADMIN_URL, PORTAL_URL } from '../urls';

/** A-01 — hành vi đăng nhập trên app mới (MSW) */
test.describe('A-01 Đăng nhập', () => {
  test('bỏ trống → báo thiếu email và mật khẩu', async ({ page }) => {
    await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page.locator('form').getByRole('alert')).toHaveText(
      'Vui lòng nhập email và mật khẩu',
    );
  });

  test('sai mật khẩu → báo sai thông tin', async ({ page }) => {
    await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
    await page
      .locator('input[autocomplete=username], input[type=email]')
      .fill('an.nguyen@mediasoft.vn');
    await page.locator('input[type=password]').fill('sai');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page.locator('form').getByRole('alert')).toHaveText(
      'Email hoặc mật khẩu không đúng',
    );
  });

  test('V2Q-163 ver2 không có hộp "Tài khoản dùng thử" trên màn đăng nhập (Portal + Admin)', async ({
    page,
  }) => {
    await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Chào mừng trở lại' })).toBeVisible();
    await expect(page.getByText(/Tài khoản dùng thử/)).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /Thành viên \(đã thanh toán phí\)/ }),
    ).toHaveCount(0);
    await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/Tài khoản dùng thử/)).toHaveCount(0);
  });

  test('nút Hiện/Ẩn mật khẩu', async ({ page }) => {
    await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Hiện' }).click();
    await expect(page.locator('input[autocomplete=current-password]')).toHaveAttribute(
      'type',
      'text',
    );
  });

  test('admin đăng nhập → Tổng quan + toast', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
    await page
      .locator('input[autocomplete=username], input[type=email]')
      .fill('admin@opchub.community');
    await page.locator('input[type=password]').fill('Admin@2026');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page).toHaveURL(/\/overview$/);
    await expect(page.getByRole('status')).toHaveText('Đăng nhập Admin Dashboard');
    await expect(page.getByRole('link', { name: 'Tổng quan' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('tài khoản thành viên không vào được Admin', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
    await page
      .locator('input[autocomplete=username], input[type=email]')
      .fill('an.nguyen@mediasoft.vn');
    await page.locator('input[type=password]').fill('User@2026');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page.locator('form').getByRole('alert')).toHaveText(
      'Tài khoản này đăng nhập ở cổng khác',
    );
  });

  test('vào trang bảo vệ khi chưa đăng nhập → về /login?next=', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/overview`);
    await expect(page).toHaveURL(/\/login\?next=%2Foverview$/);
  });

  test('D-89 màn đăng nhập v4 (Portal + Admin): không còn khối số liệu, không gọi /public/stats', async ({
    page,
  }) => {
    for (const base of [PORTAL_URL, ADMIN_URL]) {
      let stats = 0;
      page.on('request', (r) => {
        if (r.url().includes('/v1/public/stats')) stats += 1;
      });
      await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
      await expect(page.getByText('Chào mừng trở lại!', { exact: true })).toBeVisible();
      await expect(
        page.getByText('Kết nối địa phương · Kiến tạo chuỗi cung ứng quốc tế', { exact: true }),
      ).toBeVisible();
      await expect(page.getByText('4.218', { exact: true })).toHaveCount(0);
      expect(stats).toBe(0);
    }
  });
});
