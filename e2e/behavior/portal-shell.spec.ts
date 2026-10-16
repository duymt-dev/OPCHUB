import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { PORTAL_URL } from '../urls';

/** G2a — P-01 → P-16: Dashboard + khung app Portal (app mới, MSW) */

async function login(page: Page) {
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByText('Thành viên đang tham gia hoạt động')).toBeVisible();
}

test.describe('Dashboard', () => {
  test('lọc LIVE + cỡ trang + trang ghi vào URL; xem thêm tỉnh; chọn thành viên', async ({
    page,
  }) => {
    await login(page);
    await expect(page.getByText('Hiển thị 1–12 / 26 thành viên')).toBeVisible();

    await page.getByRole('radio', { name: /Đang chat/ }).click();
    await expect(page).toHaveURL(/live=chat/);
    await expect(page.getByText('Hiển thị 1–10 / 10 thành viên')).toBeVisible();
    await page.getByRole('combobox', { name: 'Số dòng mỗi trang' }).selectOption('8');
    await expect(page).toHaveURL(/size=8/);
    await page.getByRole('button', { name: 'Trang 2' }).click();
    await expect(page.getByText('Hiển thị 9–10 / 10 thành viên')).toBeVisible();
    await expect(page).toHaveURL(/page=2/);

    await page.getByText('Xem thêm 8 tỉnh/thành').click();
    await expect(page.getByText('Nghệ An')).toBeVisible();
    await page.getByText('Thu gọn', { exact: true }).click();
    await expect(page.getByText('Nghệ An')).toBeHidden();

    await page.getByRole('radio', { name: /Tất cả/ }).click();
    const tile = page.getByRole('button', { name: /Somchai Prasert.*Siam AI Labs/ });
    await tile.click();
    await expect(tile).toHaveAttribute('aria-pressed', 'true');
  });

  test('"Tham gia thảo luận →" mở chat nhóm', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Tham gia thảo luận →' }).first().click();
    await expect(page).toHaveURL(/\/chat\/c1/);
  });
});

test.describe('Khung app', () => {
  test('thông báo: chưa đọc (2) → đánh dấu tất cả → rỗng; mở nhắc tên vào chat', async ({
    page,
  }) => {
    await login(page);
    const bell = page.getByRole('button', { name: 'Thông báo' });
    await bell.click();
    await page.getByRole('tab', { name: 'Chưa đọc (2)' }).click();
    await expect(page.getByRole('dialog').getByRole('button')).toHaveCount(3);
    await page.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' }).click();
    await expect(page.getByRole('tab', { name: 'Chưa đọc (0)' })).toBeVisible();
    await expect(page.getByText('Không có thông báo')).toBeVisible();
    await page.getByRole('tab', { name: 'Tất cả' }).click();
    await page.getByText('Lê Minh Anh nhắc đến bạn trong #Hỏi đáp').click();
    await expect(page).toHaveURL(/\/chat\/c1\/qa/);
  });

  test('ngôn ngữ, menu người dùng, Trang chủ, sự kiện gần nhất', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Tiếng Việt' }).click();
    await expect(page.getByText('CHỌN QUỐC GIA & NGÔN NGỮ')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.locator('[data-m="me"]').click();
    const menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem', { name: 'Hồ sơ cá nhân' })).toBeVisible();
    await expect(menu.getByText(/Chuyển sang/)).toHaveCount(0);
    await page.keyboard.press('Escape');

    await page.locator('aside').getByText('Cộng đồng', { exact: true }).click();
    await page.getByRole('button', { name: 'Trang chủ' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole('button', { name: 'Xem chi tiết →' }).click();
    await expect(page).toHaveURL(/\/events$/);
  });

  test('thu gọn sidebar 76px, nhớ sau khi tải lại trang', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Thu gọn sidebar' }).click();
    await expect(page.locator('aside')).toHaveCSS('width', '76px');
    expect(await page.evaluate(() => localStorage.getItem('opc-sb-mini'))).toBe('1');
    await page.getByRole('button', { name: 'Mở rộng sidebar' }).click();
    await expect(page.locator('aside')).toHaveCSS('width', '248px');
  });

  test('mobile: drawer mở bằng Menu, đóng khi chọn mục', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    const aside = page.locator('aside');
    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(aside).toHaveAttribute('data-open', 'true');
    await aside.getByText('Cộng đồng', { exact: true }).click();
    await expect(aside).toHaveAttribute('data-open', 'false');
    await expect(page).toHaveURL(/\/community/);
  });
});

test('đăng ký xong: modal mail chào mừng một lần, không có mật khẩu tạm (D-30)', async ({
  page,
}) => {
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page.getByText('Đăng ký', { exact: true }).first().click();
  await page.getByText('Cá nhân', { exact: true }).click();
  await page.getByText('Chuyên gia', { exact: true }).click();
  await page.getByPlaceholder('ban@congty.vn', { exact: true }).fill('welcome@x.vn');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await page.locator('input[inputmode=numeric]').first().fill('123456');
  await page.getByRole('button', { name: 'Xác nhận & kích hoạt tài khoản' }).click();
  await expect(page).toHaveURL(/\/community$/);

  const dialog = page.getByRole('dialog', { name: 'Đã gửi email chào mừng' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('welcome@x.vn').first()).toBeVisible();
  await expect(dialog.getByText('Mật khẩu tạm')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Đóng' }).click();
  await expect(dialog).toBeHidden();
  // TK mới chờ thanh toán phí → popup bắt buộc che nền (BR-03, G3a); bấm mục bằng sự kiện DOM
  await expect(page.getByRole('dialog', { name: 'Gói dịch vụ' })).toBeVisible();
  await page.locator('aside').getByText('Dashboard', { exact: true }).dispatchEvent('click');
  await expect(page.getByText('Thành viên đang tham gia hoạt động')).toBeVisible();
  await expect(dialog).toHaveCount(0);
});
