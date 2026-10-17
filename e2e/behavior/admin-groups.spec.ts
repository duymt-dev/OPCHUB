import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL } from '../urls';

/** G4c — D-23 → D-35: Admin "Nhóm cộng đồng" (app mới, MSW) */

const SEARCH = 'Tìm theo tên nhóm hoặc tỉnh / thành...';

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });

async function openGroups(page: Page) {
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.locator('aside').getByText('Nhóm cộng đồng', { exact: true }).click();
  await expect(page.getByText('Hiển thị 1–12 / 34 nhóm')).toBeVisible();
}

const sheet = (page: Page) => page.getByRole('dialog');
const confirmBox = (page: Page) => page.getByRole('dialog', { name: /\?$/ });

test.describe('Admin · Nhóm cộng đồng', () => {
  test('lọc miền, tìm, sắp xếp, phân trang, kiểu xem — trạng thái trên URL', async ({ page }) => {
    await openGroups(page);
    await page.getByRole('button', { name: /^Miền Trung\s*11$/ }).click();
    await expect(page.getByText('Hiển thị 1–11 / 11 nhóm')).toBeVisible();
    await expect(page).toHaveURL(/region=/);

    await page.getByPlaceholder(SEARCH).fill('Đà Nẵng');
    await expect(page.getByText('Hiển thị 1–1 / 1 nhóm')).toBeVisible();
    await page.getByPlaceholder(SEARCH).fill('zzzz');
    await expect(page.getByText('Không tìm thấy nhóm phù hợp')).toBeVisible();
    await page.getByPlaceholder(SEARCH).fill('');
    await page.getByRole('button', { name: /^Tất cả\s*34$/ }).click();

    await page.getByLabel('Sắp xếp').selectOption({ label: 'Tên A–Z' });
    await expect(page.locator('article').first()).toContainText('OPC An Giang');

    await page.getByRole('button', { name: 'Trang 2' }).click();
    await expect(page.getByText('Hiển thị 13–24 / 34 nhóm')).toBeVisible();
    await expect(page).toHaveURL(/page=2/);
    await page.getByLabel('Số nhóm mỗi trang').selectOption('24');
    await expect(page.getByText('Hiển thị 1–24 / 34 nhóm')).toBeVisible();

    await page.getByTitle('Dạng danh sách').click();
    await expect(page).toHaveURL(/view=list/);
    await expect(page).toHaveURL(/size=24/);
    await expect(page.getByText('Tỉnh / Khu vực')).toBeVisible();
    await expect(page.locator('article')).toHaveCount(0);
  });

  test('tạo nhóm: kiểm lỗi theo thứ tự rồi tạo được', async ({ page }) => {
    await openGroups(page);
    await page
      .getByRole('button', { name: /Tạo nhóm/ })
      .first()
      .click();
    await expect(sheet(page)).toContainText('Tạo nhóm cộng đồng mới');
    const submit = sheet(page).getByRole('button', { name: 'Tạo nhóm', exact: true });

    await submit.click();
    await expect(toast(page)).toHaveText('Vui lòng nhập tên nhóm');
    await sheet(page).locator('select').first().selectOption('Hà Nội');
    await expect(sheet(page).getByPlaceholder('VD: OPC Đà Nẵng')).toHaveValue('OPC Hà Nội');
    await submit.click();
    await expect(toast(page)).toHaveText('Đã có nhóm cho Hà Nội');

    // Xoá Hà Nội để có tỉnh trống rồi tạo lại
    await sheet(page).getByRole('button', { name: 'Đóng' }).click();
    await page.locator('article').filter({ hasText: 'OPC Hà Nội' }).getByText('Xóa').click();
    await confirmBox(page).getByRole('button', { name: 'Xóa', exact: true }).click();
    await expect(toast(page)).toHaveText('Đã xóa OPC Hà Nội');
    await expect(page.getByText('Hiển thị 1–12 / 33 nhóm')).toBeVisible();

    await page
      .getByRole('button', { name: /Tạo nhóm/ })
      .first()
      .click();
    await sheet(page).locator('select').first().selectOption('Hà Nội');
    await submit.click();
    await expect(toast(page)).toHaveText('Vui lòng nhập mô tả');
    await sheet(page).getByPlaceholder('Nhóm dành cho ai, thảo luận về chủ đề gì...').fill('Mới');
    await sheet(page).getByText('Cần duyệt', { exact: true }).click();
    await sheet(page).getByText('+ Thêm nội quy').click();
    await submit.click();
    await expect(toast(page)).toHaveText('Đã tạo nhóm OPC Hà Nội');
    await expect(page.getByText('Hiển thị 1–12 / 34 nhóm')).toBeVisible();
  });

  test('sửa nhóm giữ dữ liệu và lưu', async ({ page }) => {
    await openGroups(page);
    await page.locator('article').filter({ hasText: 'OPC Đà Nẵng' }).getByText('Sửa').click();
    await expect(sheet(page)).toContainText('Chỉnh sửa nhóm cộng đồng');
    const name = sheet(page).getByPlaceholder('VD: OPC Đà Nẵng');
    await expect(name).toHaveValue('OPC Đà Nẵng');
    await name.fill('OPC Đà Nẵng Mới');
    await sheet(page).getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(toast(page)).toHaveText('Đã cập nhật nhóm OPC Đà Nẵng Mới');
    await expect(page.getByText('OPC Đà Nẵng Mới', { exact: true })).toBeVisible();
  });

  test('chọn nhiều → xóa có xác nhận; Xuất CSV mở hộp xuất', async ({ page }) => {
    await openGroups(page);
    await page.getByTitle('Dạng danh sách').click();
    await page.getByRole('checkbox', { name: 'Chọn OPC Hà Nội' }).click();
    await page.getByRole('checkbox', { name: 'Chọn OPC Đà Nẵng' }).click();
    await expect(page.getByText('Đã chọn 2 mục')).toBeVisible();

    await page.getByRole('button', { name: 'Xuất CSV' }).click();
    const dlg = page.getByRole('dialog', { name: 'Xuất danh sách thành viên nhóm' });
    await expect(dlg).toContainText('8 dòng · 2 nhóm · hiển thị 6 dòng đầu');
    await expect(dlg.getByRole('button', { name: /Tải xuống 8 dòng/ })).toBeVisible();
    const download = page.waitForEvent('download');
    await dlg.getByRole('button', { name: /Tải xuống/ }).click();
    expect((await download).suggestedFilename()).toMatch(/^opchub-thanh-vien-nhom-\d{8}\.csv$/);
    await expect(toast(page)).toContainText('Đã xuất 8 dòng');

    await page.getByRole('checkbox', { name: 'Chọn OPC Hà Nội' }).click();
    await page.getByRole('checkbox', { name: 'Chọn OPC Đà Nẵng' }).click();
    await page.getByRole('button', { name: 'Xóa nhóm' }).click();
    await expect(confirmBox(page)).toContainText('2 nhóm');
    await confirmBox(page).getByRole('button', { name: 'Huỷ', exact: true }).last().click();
    await expect(page.getByText('Hiển thị 1–12 / 34 nhóm')).toBeVisible();
    await page.getByRole('button', { name: 'Xóa nhóm' }).click();
    await confirmBox(page).getByRole('button', { name: 'Xóa', exact: true }).click();
    await expect(toast(page)).toHaveText('Đã xóa 2 nhóm');
    await expect(page.getByText('Hiển thị 1–12 / 32 nhóm')).toBeVisible();
  });

  test('Xem chat mở trình xem chỉ đọc (D-26)', async ({ page }) => {
    await openGroups(page);
    await page.locator('article').filter({ hasText: 'OPC Hà Nội' }).getByText('Xem chat').click();
    await expect(page).toHaveURL(/\/groups\/c1\/chat$/);
    await expect(page.getByText('Xem chat · OPC Hà Nội')).toBeVisible();
    await expect(page.getByRole('button', { name: '# Chung' })).toBeVisible();
    await expect(page.locator('textarea, input[type=text]')).toHaveCount(0);
  });

  test('kiểm duyệt: lọc nguồn, Ẩn & xóa có xác nhận, Bỏ qua tới rỗng', async ({ page }) => {
    await openGroups(page);
    await page.getByRole('tab', { name: /Kiểm duyệt tin nhắn/ }).click();
    await expect(page).toHaveURL(/tab=mod/);
    await expect(page.getByText('4 chờ xử lý')).toBeVisible();

    await page.getByRole('radio', { name: 'Tự động' }).click();
    await expect(page.getByText('Bộ lọc tự động phát hiện')).toHaveCount(2);
    await page.getByRole('radio', { name: 'Báo cáo' }).click();
    await expect(page.getByText(/thành viên báo cáo$/)).toHaveCount(2);
    await page.getByRole('radio', { name: 'Tất cả' }).click();

    await page.getByRole('button', { name: 'Ẩn & xóa' }).first().click();
    await confirmBox(page).getByRole('button', { name: 'Ẩn & xóa' }).click();
    await expect(toast(page)).toHaveText('Đã ẩn và xóa tin nhắn khỏi phòng chat');
    await expect(page.getByText('3 chờ xử lý')).toBeVisible();

    for (let i = 0; i < 3; i += 1)
      await page.getByRole('button', { name: 'Bỏ qua' }).first().click();
    await expect(page.getByText('Không còn tin nhắn nhạy cảm cần xử lý.')).toBeVisible();
    await expect(page.getByText('0 chờ xử lý')).toBeVisible();
  });

  test('từ khóa: thêm bằng nút / Enter, trùng bỏ qua, bấm chip để xóa', async ({ page }) => {
    await openGroups(page);
    await page.getByRole('tab', { name: /Kiểm duyệt tin nhắn/ }).click();
    await expect(page.getByText('7 từ khóa')).toBeVisible();
    const input = page.getByPlaceholder('Thêm từ khóa...');

    await input.fill('test');
    await page.getByRole('button', { name: 'Thêm', exact: true }).click();
    await expect(toast(page)).toHaveText('Đã thêm từ khóa “test”');
    await expect(page.getByText('8 từ khóa')).toBeVisible();
    await expect(input).toHaveValue('');

    await input.fill('lừa');
    await input.press('Enter');
    await expect(page.getByText('9 từ khóa')).toBeVisible();
    await input.fill('test');
    await input.press('Enter');
    await expect(page.getByText('9 từ khóa')).toBeVisible();

    await page.getByRole('button', { name: 'test ×' }).click();
    await expect(page.getByText('8 từ khóa')).toBeVisible();
  });
});
