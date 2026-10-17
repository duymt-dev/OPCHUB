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
    await page.locator('input[type=email]').fill('an.nguyen@mediasoft.vn');
    await page.locator('input[type=password]').fill('sai');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page.locator('form').getByRole('alert')).toHaveText(
      'Email hoặc mật khẩu không đúng',
    );
  });

  test('bấm tài khoản dùng thử → điền form, đăng nhập vào Portal', async ({ page }) => {
    await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Thành viên \(đã thanh toán phí\)/ }).click();
    await expect(page.locator('input[type=email]')).toHaveValue('an.nguyen@mediasoft.vn');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('status')).toHaveText('Xin chào, đăng nhập User Portal');
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
    await page.getByRole('button', { name: /Quản trị viên \(Admin\)/ }).click();
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
    await page.getByRole('button', { name: /Thành viên \(đã thanh toán phí\)/ }).click();
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page.locator('form').getByRole('alert')).toHaveText(
      'Tài khoản này đăng nhập ở cổng khác',
    );
  });

  test('vào trang bảo vệ khi chưa đăng nhập → về /login?next=', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/overview`);
    await expect(page).toHaveURL(/\/login\?next=%2Foverview$/);
  });
});
