import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL } from '../urls';
import { onServer } from '../server/api';

/**
 * G5c — D-61 → D-65 Dịch vụ (Admin): lọc trạng thái + tìm (URL), phân trang, chuyển trạng thái
 * theo máy trạng thái, từ chối (xác nhận) / mở lại, phụ trách, bình luận, danh mục.
 */

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });
const table = (page: Page) => page.locator('[data-m="tbl"]');
const row = (page: Page, text: string) => table(page).getByRole('row').filter({ hasText: text });
/**
 * Q-B62-19: nhân sự phụ trách trên API thật = TK quản trị có `n.edit` (Q-B46-1), không phải danh
 * sách cứng SERVICE_STAFF của mock (st1–st4 không có tài khoản).
 */
const STAFF = onServer ? 'Nguyễn Văn An' : 'Phạm Thu Hà';
const MENTION = onServer ? 'Quản trị hệ thống' : 'Trần Đức Anh';
const drawer = (page: Page, code: string) => page.getByRole('dialog', { name: `Yêu cầu ${code}` });

async function openRequests(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.locator('aside').getByText('Dịch vụ', { exact: true }).click();
  await expect(page.getByText('Yêu cầu đăng ký dịch vụ')).toBeVisible();
  await expect(row(page, 'YC-1005')).toBeVisible();
}

test.describe('Admin · Dịch vụ', () => {
  test('lọc trạng thái + tìm ghi lên URL; phân trang', async ({ page }) => {
    await openRequests(page);
    await expect(page).toHaveURL(/\/requests$/);
    await page.getByRole('radio', { name: /^Đã báo giá/ }).click();
    await expect(page).toHaveURL(/status=quoted/);
    await expect(table(page).getByRole('row')).toHaveCount(2);
    await expect(row(page, 'YC-1003')).toBeVisible();

    await page.getByRole('radio', { name: /^Tất cả/ }).click();
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

  test('chuyển trạng thái theo máy trạng thái + phụ trách', async ({ page }) => {
    await openRequests(page);
    await row(page, 'YC-1005').getByRole('button', { name: 'Chi tiết' }).click();
    const d = drawer(page, 'YC-1005');
    await d.getByRole('button', { name: 'Chuyển sang: Đang tư vấn' }).click();
    await expect(toast(page)).toHaveText('YC-1005 → Đang tư vấn');
    await d.getByRole('button', { name: 'Chuyển sang: Đã báo giá' }).click();
    await expect(toast(page)).toHaveText('YC-1005 → Đã báo giá');
    await expect(d.getByRole('button', { name: 'Chuyển sang: Đã chốt' })).toBeVisible();

    await d.getByLabel('Nhân sự phụ trách').selectOption(STAFF);
    await expect(toast(page)).toHaveText(`Đã giao cho ${STAFF}`);
    await page.keyboard.press('Escape');
    await expect(row(page, 'YC-1005')).toContainText(STAFF);
    await expect(row(page, 'YC-1005')).toContainText('Đã báo giá');
  });

  test('từ chối cần xác nhận; Hủy giữ nguyên; mở lại → Đang tư vấn', async ({ page }) => {
    await openRequests(page);
    await row(page, 'YC-1004').getByRole('button', { name: 'Chi tiết' }).click();
    const d = drawer(page, 'YC-1004');
    await d.getByRole('button', { name: 'Từ chối', exact: true }).click();
    const cf = page.getByRole('alertdialog');
    await expect(cf).toContainText('Từ chối yêu cầu YC-1004?');
    await cf.getByRole('button', { name: 'Hủy' }).click();
    await expect(d.getByText('Yêu cầu đã bị từ chối.')).toHaveCount(0);

    await d.getByRole('button', { name: 'Từ chối', exact: true }).click();
    await cf.getByRole('button', { name: 'Từ chối', exact: true }).click();
    await expect(toast(page)).toHaveText('YC-1004 → Từ chối');
    await expect(d.getByText('Yêu cầu đã bị từ chối.')).toBeVisible();
    await expect(d.getByRole('button', { name: /^Chuyển sang/ })).toHaveCount(0);

    await d.getByRole('button', { name: 'Mở lại tư vấn' }).click();
    await expect(toast(page)).toHaveText('YC-1004 → Đang tư vấn');
    await expect(d.getByRole('button', { name: 'Chuyển sang: Đã báo giá' })).toBeVisible();
  });

  test('bình luận nội bộ có gắn tên', async ({ page }) => {
    await openRequests(page);
    await row(page, 'YC-1003').getByRole('button', { name: 'Chi tiết' }).click();
    const d = drawer(page, 'YC-1003');
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
    await page.getByRole('tab', { name: /^Danh mục dịch vụ/ }).click();
    await expect(page).toHaveURL(/\/requests\/catalog$/);
    await expect(page.getByText('Danh mục chương trình & dịch vụ')).toBeVisible();
    const sw = page.getByRole('switch').first();
    await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', 'false');

    await page.locator('[title="Xóa"]').first().click();
    await expect(toast(page)).toHaveText('Dịch vụ đã có yêu cầu – hãy tắt hiển thị thay vì xóa');
    await page.locator('[title="Xóa"]').nth(5).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xóa' }).click();
    await expect(toast(page)).toHaveText('Đã xóa dịch vụ');
    await expect(page.getByRole('switch')).toHaveCount(5);
    await page.goBack();
    await expect(page).toHaveURL(/\/requests$/);
    await expect(page.getByText('Yêu cầu đăng ký dịch vụ')).toBeVisible();
  });
});
