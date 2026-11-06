import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL, PORTAL_URL } from '../urls';
import { onServer } from '../server/api';

/**
 * V4-608 UP-08 · UT-09 · AD-07 (REQ-510, D-75, D-84): Khám phá + lọc, chi tiết liên hệ, Gian hàng
 * của tôi (về nháp / xuất bản không duyệt), Admin ẩn → biến mất phía User.
 * Server thật: `seed:demo` mặc định chỉ có `st1` (Q-V4-608-7) → ca đếm 17 chỉ ở MSW.
 */

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });

async function login(page: Page, origin: string, email: string, password: string) {
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[autocomplete=username], input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

const member = (page: Page) => login(page, PORTAL_URL, 'an.nguyen@mediasoft.vn', 'User@2026');
const explore = (page: Page) => page.locator('[data-screen="stores-explore"]');
const results = (page: Page) => explore(page).getByText(/^\d+ kết quả$/);

test.describe('Gian hàng địa phương', () => {
  test('UP-08: menu → Khám phá, tìm / lọc / đặt lại; mở chi tiết có Email · Zalo · Gọi', async ({
    page,
  }) => {
    await member(page);
    await page.locator('aside nav').getByRole('link', { name: 'Gian hàng địa phương' }).click();
    await expect(page).toHaveURL(/\/stores$/);
    const all = onServer ? 1 : 17;
    await expect(results(page)).toHaveText(`${all} kết quả`);

    await explore(page).getByRole('search').getByRole('textbox').fill('khongtontai');
    await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
    await expect(explore(page)).toContainText('Không tìm thấy giải pháp phù hợp.');
    await page.getByRole('button', { name: '↻ Đặt lại' }).click();
    await expect(results(page)).toHaveText(`${all} kết quả`);

    const side = page.getByRole('complementary', { name: 'Bộ lọc' });
    await side.getByRole('button', { name: /^Dịch vụ/ }).click();
    await expect(results(page)).not.toHaveText('0 kết quả');
    await side.getByRole('button', { name: /^Tất cả/ }).click();

    await explore(page)
      .getByRole('link', { name: /Công ty TNHH Giải pháp MediaSoft/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/stores\/st1$/);
    const detail = page.locator('[data-screen="stores-detail"]');
    await expect(detail).toContainText('Sản phẩm & Dịch vụ');
    await expect(detail).toContainText('Liên hệ báo giá');
    await expect(detail.locator('[data-action="email"]')).toHaveAttribute(
      'href',
      'mailto:an.nguyen@mediasoft.vn',
    );
    await expect(detail.locator('[data-action="zalo"]')).toHaveAttribute(
      'href',
      'https://zalo.me/0912345678',
    );
    await expect(detail.locator('[data-action="call"]')).toHaveAttribute(
      'href',
      'tel:+84912345678',
    );
  });

  test('D-114 S6/S8: dashboard số thật → sửa gian hàng đang hiển thị (đủ 5 bước); Admin ẩn → biến mất, hiện lại', async ({
    page,
    context,
  }) => {
    await member(page);
    await page.goto(`${PORTAL_URL}/stores/mine`, { waitUntil: 'networkidle' });
    const mine = page.locator('[data-screen="stores-mine"]');
    await expect(mine).toContainText('Thông tin gian hàng');
    await expect(mine).toContainText('Đang hiển thị');

    // D-114 S8 B: gian hàng đang hiển thị sửa qua trình tạo, nút cuối "Lưu thay đổi" (đủ 5 bước, không gỡ khỏi Khám phá)
    await mine.getByRole('button', { name: 'Chỉnh sửa gian hàng' }).click();
    const wizard = page.locator('[data-screen="stores-wizard"]');
    await expect(wizard).toContainText('Chỉnh sửa gian hàng');
    await wizard.getByRole('button', { name: /Liên hệ & xuất bản/ }).click();
    await expect(wizard).toContainText('Mức độ hoàn thiện');
    await wizard.getByRole('button', { name: 'Lưu thay đổi' }).last().click();
    await expect(toast(page)).toHaveText('Đã lưu gian hàng');
    await expect(mine).toContainText('Đang hiển thị');

    const admin = await context.newPage();
    await login(admin, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    await admin.locator('aside nav').getByRole('link', { name: 'Gian hàng' }).click();
    const row = admin.locator('[data-store="st1"]');
    await expect(row).toContainText('Đang hiển thị');
    await row.getByRole('button', { name: 'Ẩn', exact: true }).click();
    await expect(toast(admin)).toHaveText('Đã ẩn 1 gian hàng');
    await expect(row).toContainText('Admin đã ẩn');

    await page.goto(`${PORTAL_URL}/stores`, { waitUntil: 'networkidle' });
    await expect(explore(page).getByRole('link', { name: /Giải pháp MediaSoft/ })).toHaveCount(0);

    await page.goto(`${PORTAL_URL}/stores/mine`, { waitUntil: 'networkidle' });
    await mine.getByRole('button', { name: 'Chỉnh sửa gian hàng' }).click();
    await expect(wizard).toContainText('Gian hàng đang bị Admin ẩn khỏi trang Khám phá.');

    await row.getByRole('button', { name: 'Hiển thị', exact: true }).click();
    await expect(toast(admin)).toHaveText('Đã hiển thị 1 gian hàng');
    await expect(row).toContainText('Đang hiển thị');
  });

  test('D-89 P-105: thẻ có lượt xem, "Nổi bật"; tim yêu thích giữ sau F5, mở chi tiết tăng lượt xem', async ({
    page,
  }) => {
    await member(page);
    await page.goto(`${PORTAL_URL}/stores`, { waitUntil: 'networkidle' });
    const card = explore(page).getByRole('link', { name: /Công ty TNHH Giải pháp MediaSoft/ });
    await expect(card.getByText('Nổi bật', { exact: true })).toBeVisible();
    const views = Number(
      (await card.getByTitle(/lượt xem$/).textContent())?.replace(/\D/g, '') ?? 'NaN',
    );
    expect(views).toBeGreaterThan(0);

    const heart = card.getByRole('button', { name: 'Quan tâm' });
    await expect(heart).toHaveAttribute('aria-pressed', 'false');
    await heart.click();
    await expect(toast(page)).toHaveText(
      'Đã thêm Công ty TNHH Giải pháp MediaSoft vào mục quan tâm',
    );
    await expect(heart).toHaveAttribute('aria-pressed', 'true');
    // Bấm tim không mở chi tiết
    await expect(page).toHaveURL(/\/stores$/);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(heart).toHaveAttribute('aria-pressed', 'true');
    await heart.click();
    await expect(toast(page)).toHaveText('Đã bỏ quan tâm Công ty TNHH Giải pháp MediaSoft');
    await expect(heart).toHaveAttribute('aria-pressed', 'false');

    // TK demo là chủ st1 → tự xem không tính; lượt xem giữ nguyên
    await card.click();
    await expect(page).toHaveURL(/\/stores\/st1$/);
    await page.goto(`${PORTAL_URL}/stores`, { waitUntil: 'networkidle' });
    await expect(card.getByTitle(/lượt xem$/)).toHaveText(views.toLocaleString('vi-VN'));
  });
});
