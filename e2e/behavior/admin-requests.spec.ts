import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL } from '../urls';

/**
 * G5c — D-61 → D-65 Dịch vụ (Admin): tìm (URL), phân trang, ghi chú nội bộ gắn tên, danh mục.
 * D-72 (V4-605): không trạng thái, không chuyển trạng thái, không phụ trách.
 */

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });
const table = (page: Page) => page.locator('[data-m="tbl"]');
const row = (page: Page, text: string) => table(page).getByRole('row').filter({ hasText: text });
/**
 * Q-B62-19, D-63, Q-V4-605-1: người gắn tên được = TK quản trị có `services.action` (Q-B46-1) ở cả MSW và
 * server — seed demo: Super Admin `admin` + Quản trị viên Phạm Thu Trang (§21.2).
 */
const MENTION = 'Quản trị hệ thống';
const drawer = (page: Page, code: string) => page.getByRole('dialog', { name: `Yêu cầu ${code}` });

async function openRequests(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.locator('aside').getByText('Dịch vụ', { exact: true }).click();
  await expect(page.getByText('Yêu cầu đăng ký dịch vụ')).toBeVisible();
  await expect(row(page, 'YC-1005')).toBeVisible();
}

test.describe('Admin · Dịch vụ', () => {
  test('D-72 không thống kê / chip trạng thái / cột Phụ trách; tìm ghi lên URL; phân trang', async ({
    page,
  }) => {
    await openRequests(page);
    await expect(page).toHaveURL(/\/requests$/);
    await expect(page.getByRole('radio')).toHaveCount(0);
    await expect(
      page.getByText(/Mới đăng ký|Đang tư vấn|Đã báo giá|Thành công|Từ chối/),
    ).toHaveCount(0);
    await expect(page.getByText('Phụ trách', { exact: true })).toHaveCount(0);

    await page.getByPlaceholder('Tìm mã, tên, email, tổ chức...').fill('solobooks');
    await expect(page).toHaveURL(/q=solobooks/);
    await expect(table(page).getByRole('row')).toHaveCount(2);
    await expect(row(page, 'YC-1001')).toBeVisible();
    await page.getByPlaceholder('Tìm mã, tên, email, tổ chức...').fill('zzzz');
    await expect(page.getByText('Không có yêu cầu phù hợp')).toBeVisible();
    await page.getByPlaceholder('Tìm mã, tên, email, tổ chức...').fill('');

    await page.getByRole('combobox', { name: 'Số dòng mỗi trang' }).selectOption('6');
    await expect(page).toHaveURL(/size=6/);
    await expect(page.getByText('Hiển thị 1–5 / 5 yêu cầu')).toBeVisible();
  });

  test('D-63 TD-033 drawer chỉ thông tin + ghi chú nội bộ gắn tên (D-72)', async ({ page }) => {
    await openRequests(page);
    await row(page, 'YC-1003').getByRole('button', { name: 'Chi tiết' }).click();
    const d = drawer(page, 'YC-1003');
    await expect(
      d.getByRole('button', { name: /^Chuyển sang|^Từ chối$|Mở lại tư vấn/ }),
    ).toHaveCount(0);
    await expect(d.getByRole('combobox')).toHaveCount(0);
    await expect(d.getByText('Nhân sự phụ trách')).toHaveCount(0);
    await expect(d.getByText('1 bình luận · chỉ quản trị viên thấy')).toBeVisible();
    await d.getByRole('button', { name: 'Gửi bình luận' }).click();
    await expect(toast(page)).toHaveText('Nhập nội dung bình luận');
    await d.locator('.ProseMirror').click();
    await page.keyboard.type('Trường đã đồng ý báo giá');
    await d.getByRole('button', { name: `@${MENTION}` }).click();
    await d.getByRole('button', { name: 'Gửi bình luận' }).click();
    await expect(toast(page)).toHaveText(`Đã gửi và thông báo tới ${MENTION}`);
    await expect(d.getByText('2 bình luận · chỉ quản trị viên thấy')).toBeVisible();
    await expect(d.getByText('Trường đã đồng ý báo giá')).toBeVisible();
  });

  test('danh mục: tab trên URL, tắt hiển thị, xoá cần xác nhận', async ({ page }) => {
    await openRequests(page);
    await page.getByRole('tab', { name: /^Danh mục chương trình & dịch vụ/ }).click();
    await expect(page).toHaveURL(/\/requests\/catalog$/);
    await expect(
      page.getByRole('heading', { name: 'Danh mục chương trình & dịch vụ' }),
    ).toBeVisible();
    const sw = page.getByRole('switch').first();
    await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', 'false');

    // D-60 danh mục V4: "Đào tạo & Ươm mầm OPC" (thứ 2) đã có phiếu YC-1005
    await page.locator('[title="Xóa"]').nth(1).click();
    await expect(toast(page)).toHaveText('Dịch vụ đã có yêu cầu – hãy tắt hiển thị thay vì xóa');
    await page.locator('[title="Xóa"]').nth(5).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xóa' }).click();
    await expect(toast(page)).toHaveText('Đã xóa dịch vụ');
    // V4-605 danh mục v4 có 15 mục → còn 14 sau khi xoá
    await expect(page.getByRole('switch')).toHaveCount(14);
    await page.goBack();
    await expect(page).toHaveURL(/\/requests$/);
    await expect(page.getByText('Yêu cầu đăng ký dịch vụ')).toBeVisible();
  });

  test('UAT-23 BUG-023 /requests?code= mở drawer phiếu', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // Link @nhắc trong thông báo; trang hiện tại không chứa phiếu → tìm theo mã rồi mở
    await page.goto(`${ADMIN_URL}/requests?code=YC-1001&size=6`, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/login\?next=/);
    await page
      .locator('input[autocomplete=username], input[type=email]')
      .fill('admin@opchub.community');
    await page.locator('input[type=password]').fill('Admin@2026');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    const d = drawer(page, 'YC-1001');
    await expect(d).toBeVisible();
    await expect(page).toHaveURL(/\/requests\?.*code=YC-1001/);
    await expect(row(page, 'YC-1001')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(d).toHaveCount(0);
    await expect(page).not.toHaveURL(/code=/);
  });
});
