import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL, PORTAL_URL } from '../urls';
import { onServer } from '../server/api';

/**
 * V4-609 UP-09 · AD-07 (REQ-511, D-75): Nhu cầu địa phương — danh sách + lọc, chủ gian hàng (M1)
 * đăng (hiện ngay) → đóng / mở lại / xoá, "Đang cần" ở gian hàng; Admin ẩn / hiện.
 * Server thật: `seed:demo` mặc định chỉ có `n11` của `st1` (Q-V4-608-7). MSW: kho tách theo cổng
 * (Q-V4-609-5) → ca Admin dùng nhu cầu seed `n11`.
 */

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });

async function login(page: Page, origin: string, email: string, password: string) {
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

const N11 = 'Đối tác tư vấn kế toán, thuế cho học viên OPC tại TP.HCM';
const TITLE = 'Cần 200 hộp quà Tết khắc logo e2e';
const list = (page: Page) => page.locator('[data-screen="needs-list"]');

test.describe('Nhu cầu địa phương', () => {
  test('UP-09: menu → danh sách + lọc loại; M1 đăng → hiện ngay → đóng / mở lại / xoá', async ({
    page,
  }) => {
    await login(page, PORTAL_URL, 'an.nguyen@mediasoft.vn', 'User@2026');
    await page.locator('aside nav').getByRole('link', { name: 'Nhu cầu địa phương' }).click();
    await expect(page).toHaveURL(/\/needs$/);
    const total = onServer ? 1 : 11;
    await expect(list(page)).toContainText(`${total} nhu cầu đang mở`);
    await expect(list(page).locator('[data-need="n11"]').first()).toContainText(N11);

    await list(page)
      .getByRole('button', { name: /^Cần đối tác/ })
      .click();
    await expect(list(page).locator('[data-need]').first()).toContainText('Cần đối tác');
    await list(page)
      .getByRole('button', { name: /^Tất cả/ })
      .click();

    await page.getByRole('button', { name: 'Đăng nhu cầu' }).click();
    const form = page.getByRole('dialog', { name: 'Đăng nhu cầu' });
    await expect(form).toContainText('hiển thị ngay, không cần Admin duyệt');
    await form.getByPlaceholder('VD: Cần 50 kg cà phê Robusta rang mộc mỗi tháng').fill(TITLE);
    await form
      .getByRole('combobox', { name: /Ngành cần tìm/ })
      .selectOption('Thủ công & Làng nghề');
    const desc = form.getByPlaceholder(/tối thiểu 20 ký tự/);
    await desc.fill('ngắn');
    await form.getByRole('button', { name: 'Đăng nhu cầu', exact: true }).click();
    await expect(toast(page)).toHaveText('Mô tả chi tiết tối thiểu 20 ký tự');
    await desc.fill('Hộp gỗ khắc logo, giao trước 15/01, có hoá đơn VAT.');
    await form.getByRole('button', { name: 'Đăng nhu cầu', exact: true }).click();
    await expect(toast(page).last()).toHaveText('Đã đăng nhu cầu — hiển thị ngay, không cần duyệt');

    await expect(page).toHaveURL(/\/needs\/mine$/);
    const row = page.locator('[data-screen="needs-mine"] [data-need]').filter({ hasText: TITLE });
    await expect(row).toContainText('Đang mở');
    await row.getByRole('button', { name: 'Đóng nhu cầu' }).click();
    await expect(row).toContainText('Đã đóng');
    await row.getByRole('button', { name: 'Mở lại' }).click();
    await expect(row).toContainText('Đang mở');

    await page.getByRole('tab', { name: 'Tất cả nhu cầu' }).click();
    await expect(list(page)).toContainText(`${total + 1} nhu cầu đang mở`);
    await expect(list(page)).toContainText(TITLE);

    await page.getByRole('tab', { name: 'Nhu cầu của tôi' }).click();
    await row.getByRole('button', { name: 'Xóa' }).click();
    await expect(row).toHaveCount(0);
  });

  test('gian hàng có nhu cầu đang mở: khối "Đang cần" ở chi tiết + badge "Đang tìm đối tác"', async ({
    page,
  }) => {
    await login(page, PORTAL_URL, 'an.nguyen@mediasoft.vn', 'User@2026');
    await page.goto(`${PORTAL_URL}/stores`, { waitUntil: 'networkidle' });
    const card = page
      .locator('[data-screen="stores-explore"]')
      .getByRole('button', { name: /Công ty TNHH Giải pháp MediaSoft/ })
      .first();
    await expect(card).toContainText('Đang tìm đối tác');
    await card.click();
    const block = page.locator('[data-block="store-needs"]');
    await expect(block).toContainText('Đang cần');
    await expect(block).toContainText(N11);
    await block.getByRole('button', { name: 'Xem Nhu cầu địa phương →' }).click();
    await expect(page).toHaveURL(/\/needs$/);
  });

  test('AD-07: Admin ẩn nhu cầu → "Admin đã ẩn", chủ không xoá được; hiện lại hàng loạt', async ({
    page,
    context,
  }) => {
    await login(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    await page.locator('aside nav').getByRole('link', { name: 'Nhu cầu địa phương' }).click();
    await expect(page).toHaveURL(/\/needs$/);
    await expect(page.getByText('Nhu cầu hiển thị ngay khi thành viên đăng')).toBeVisible();
    const row = page.locator('[data-need="n11"]');
    await expect(row).toContainText('Đang mở');
    await row.getByRole('button', { name: 'Ẩn', exact: true }).click();
    await expect(toast(page)).toHaveText('Đã ẩn 1 nhu cầu');
    await expect(row).toContainText('Admin đã ẩn');

    await page.getByRole('radio', { name: /Đã ẩn/ }).click();
    await expect(page).toHaveURL(/status=hidden/);
    await expect(row).toBeVisible();

    if (onServer) {
      const user = await context.newPage();
      await login(user, PORTAL_URL, 'an.nguyen@mediasoft.vn', 'User@2026');
      await user.goto(`${PORTAL_URL}/needs/mine`, { waitUntil: 'networkidle' });
      const mine = user.locator('[data-need="n11"]');
      await expect(mine).toContainText('Liên hệ Admin để mở lại');
      await mine.getByRole('button', { name: 'Xóa' }).click();
      await expect(mine).toBeVisible();
    }

    await row.getByRole('checkbox').check();
    const bulk = page.getByRole('region', { name: 'Thao tác hàng loạt' });
    await expect(bulk).toContainText('1 nhu cầu đã chọn');
    await bulk.getByRole('button', { name: 'Hiển thị', exact: true }).click();
    await expect(toast(page)).toHaveText('Đã hiển thị 1 nhu cầu');
    await expect(row).toHaveCount(0);
    await page.getByRole('radio', { name: /Đang mở/ }).click();
    await expect(page.locator('[data-need="n11"]')).toContainText('Đang mở');
  });
});
