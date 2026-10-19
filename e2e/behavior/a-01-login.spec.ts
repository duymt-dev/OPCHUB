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

  test('BUG-029 CR-15 số liệu màn đăng nhập (Portal + Admin) lấy từ GET /public/stats', async ({
    page,
  }) => {
    for (const base of [PORTAL_URL, ADMIN_URL]) {
      const res = page.waitForResponse((r) => r.url().includes('/v1/public/stats') && r.ok());
      await page.goto(`${base}/login`);
      const s = (await (await res).json()) as {
        members: number;
        communities: number;
        online: number;
      };
      const vi = (n: number) => n.toLocaleString('vi-VN');
      await expect(page.getByText(`${vi(s.online)}`).first()).toBeVisible();
      await expect(page.getByText(vi(s.members), { exact: true }).first()).toBeVisible();
      await expect(page.getByText(vi(s.communities), { exact: true }).first()).toBeVisible();
      // không còn số cứng của prototype
      await expect(page.getByText('4.218', { exact: true })).toHaveCount(0);
      await expect(page.getByText('+452', { exact: true })).toHaveCount(0);
    }
  });
});
