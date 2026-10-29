import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL } from '../urls';

/** G4c — D-23 → D-35: Admin "Nhóm cộng đồng" (app mới, MSW) */

const SEARCH = 'Tìm theo tên nhóm hoặc tỉnh / thành...';

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });

async function openGroups(page: Page) {
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.locator('aside').getByText('Nhóm cộng đồng', { exact: true }).click();
  await expect(page.getByText('Hiển thị 1–12 / 90 nhóm')).toBeVisible();
}

const sheet = (page: Page) => page.getByRole('dialog');
/** BUG-044: hộp xác nhận dùng chung `packages/ui` (role=alertdialog) */
const confirmBox = (page: Page) => page.getByRole('alertdialog');

test.describe('Admin · Nhóm cộng đồng', () => {
  test('lọc miền, tìm, sắp xếp, phân trang, kiểu xem — trạng thái trên URL', async ({ page }) => {
    await openGroups(page);
    // D-71 (V4-615): không còn ghi chú "Yêu cầu tham gia nhóm do chủ nhóm … duyệt" như prototype v4
    await expect(page.getByText(/Yêu cầu tham gia nhóm do/)).toHaveCount(0);
    await page.getByRole('button', { name: /^Miền Trung\s*30$/ }).click();
    await expect(page.getByText('Hiển thị 1–12 / 30 nhóm')).toBeVisible();
    await expect(page).toHaveURL(/region=/);

    await page.getByPlaceholder(SEARCH).fill('Đà Nẵng');
    await expect(page.getByText('Hiển thị 1–5 / 5 nhóm')).toBeVisible();
    await page.getByPlaceholder(SEARCH).fill('zzzz');
    await expect(page.getByText('Không tìm thấy nhóm phù hợp')).toBeVisible();
    await page.getByPlaceholder(SEARCH).fill('');
    await page.getByRole('button', { name: /^Tất cả\s*90$/ }).click();

    await page.getByLabel('Sắp xếp').selectOption({ label: 'Tên A–Z' });
    await expect(page.locator('article').first()).toContainText('OPC An Giang');

    await page.getByRole('button', { name: 'Trang 2' }).click();
    await expect(page.getByText('Hiển thị 13–24 / 90 nhóm')).toBeVisible();
    await expect(page).toHaveURL(/page=2/);
    await page.getByLabel('Số nhóm mỗi trang').selectOption('24');
    await expect(page.getByText('Hiển thị 1–24 / 90 nhóm')).toBeVisible();

    await page.getByTitle('Dạng danh sách').click();
    await expect(page).toHaveURL(/view=list/);
    await expect(page).toHaveURL(/size=24/);
    await expect(page.getByText('Tỉnh / Khu vực')).toBeVisible();
    await expect(page.locator('article')).toHaveCount(0);
  });

  test('BUG-022 tạo nhóm trống → mọi ô bắt buộc đánh dấu', async ({ page }) => {
    await openGroups(page);
    await page
      .getByRole('button', { name: /Tạo nhóm/ })
      .first()
      .click();
    const form = sheet(page);
    await form.getByRole('button', { name: 'Tạo nhóm', exact: true }).click();
    await expect(toast(page)).toHaveText('Vui lòng nhập tên nhóm');
    const name = form.getByPlaceholder('VD: OPC Đà Nẵng');
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(form.locator('select').first()).toHaveAttribute('aria-invalid', 'true');
    await expect(form.locator('textarea').first()).toHaveAttribute('aria-invalid', 'true');
    await expect(form.getByText('Vui lòng chọn tỉnh / thành phố')).toBeVisible();
    await expect(form.getByText('Vui lòng nhập mô tả')).toBeVisible();
    await expect(name).toBeFocused();
    // Trùng tỉnh gắn vào ô tỉnh
    await form.locator('select').first().selectOption('Hà Nội');
    await form.getByRole('button', { name: 'Tạo nhóm', exact: true }).click();
    await expect(
      form.getByText('Đã có Nhóm tỉnh chung cho Hà Nội – chọn loại Nhóm ngành').first(),
    ).toBeVisible();
    await expect(form.locator('select').first()).toHaveAttribute('aria-invalid', 'true');
    await expect(name).not.toHaveAttribute('aria-invalid', 'true');
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
    await expect(toast(page)).toHaveText('Đã có Nhóm tỉnh chung cho Hà Nội – chọn loại Nhóm ngành');

    // Xoá Hà Nội để có tỉnh trống rồi tạo lại
    await sheet(page).getByRole('button', { name: 'Đóng' }).click();
    await page
      .locator('article')
      .filter({ has: page.getByText('OPC Hà Nội', { exact: true }) })
      .getByText('Xóa')
      .click();
    await confirmBox(page).getByRole('button', { name: 'Xóa', exact: true }).click();
    await expect(toast(page)).toHaveText('Đã xóa OPC Hà Nội');
    await expect(page.getByText('Hiển thị 1–12 / 89 nhóm')).toBeVisible();

    await page
      .getByRole('button', { name: /Tạo nhóm/ })
      .first()
      .click();
    await sheet(page).locator('select').first().selectOption('Hà Nội');
    await submit.click();
    await expect(toast(page)).toHaveText('Vui lòng nhập mô tả');
    await sheet(page).getByPlaceholder('Nhóm dành cho ai, thảo luận về chủ đề gì...').fill('Mới');
    // D-71: form không còn "Quyền tham gia" (Công khai / Cần duyệt)
    await expect(sheet(page).getByText('Quyền tham gia')).toHaveCount(0);
    await expect(sheet(page).getByText('Cần duyệt', { exact: true })).toHaveCount(0);
    await sheet(page).getByText('+ Thêm nội quy').click();
    // REQ-209 NA-09: chủ đề do Admin thêm trong form
    await expect(
      sheet(page).getByText('· chỉ quản trị viên tạo, thành viên tham gia'),
    ).toBeVisible();
    await expect(sheet(page).getByText('Thêm giảng viên')).toBeVisible();
    await sheet(page).getByText('+ Thêm chủ đề').click();
    await sheet(page).getByPlaceholder('ten-phong').last().fill('Tuyển dụng');
    await submit.click();
    await expect(toast(page)).toHaveText('Đã tạo nhóm OPC Hà Nội');
    await expect(page.getByText('Hiển thị 1–12 / 90 nhóm')).toBeVisible();
  });

  test('D-89 v4: lọc loại nhóm + ngành; tạo Nhóm ngành thuộc nhóm tỉnh', async ({ page }) => {
    await openGroups(page);
    await page.getByRole('button', { name: /^Nhóm ngành\s*56$/ }).click();
    await expect(page.getByText('Hiển thị 1–12 / 56 nhóm')).toBeVisible();
    await expect(page).toHaveURL(/kind=industry/);
    await page.getByRole('button', { name: /^Nhóm tỉnh\s*34$/ }).click();
    await expect(page.getByText('Hiển thị 1–12 / 34 nhóm')).toBeVisible();
    // Chọn ngành → tự chuyển sang "Nhóm ngành"
    await page.getByLabel('Lọc theo ngành').selectOption('Cà phê');
    await expect(page.getByRole('button', { name: /^Nhóm ngành\s*56$/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByText('Hiển thị 1–6 / 6 nhóm')).toBeVisible();
    await expect(page.locator('article').filter({ hasText: 'OPC Đắk Lắk – Cà phê' })).toHaveCount(
      1,
    );
    await page.getByTitle('Dạng danh sách').click();
    await expect(page.getByText('Nhóm ngành · Cà phê')).toHaveCount(6);

    await page
      .getByRole('button', { name: /Tạo nhóm/ })
      .first()
      .click();
    const form = sheet(page);
    await form.locator('select').first().selectOption('Huế');
    await form.getByRole('radio', { name: /Nhóm ngành/ }).click();
    await form.getByPlaceholder('Nhóm dành cho ai, thảo luận về chủ đề gì...').fill('Huế');
    await form.getByRole('button', { name: 'Tạo nhóm', exact: true }).click();
    await expect(form.getByText('Vui lòng nhập ngành của nhóm').first()).toBeVisible();
    const ind = form.getByPlaceholder('VD: Cà phê, Du lịch biển, Thương mại điện tử');
    // Huế đã có nhóm ngành "Ẩm thực" (seed v4) → báo trùng tại ô Ngành
    await ind.fill('ẩm thực');
    await form.getByRole('button', { name: 'Tạo nhóm', exact: true }).click();
    await expect(form.getByText('Đã có nhóm ngành này ở Huế').first()).toBeVisible();
    await ind.fill('Cà phê');
    await expect(form.getByPlaceholder('VD: OPC Đà Nẵng')).toHaveValue('OPC Huế – Cà phê');
    await form.getByRole('button', { name: 'Tạo nhóm', exact: true }).click();
    await expect(toast(page)).toHaveText('Đã tạo nhóm OPC Huế – Cà phê');
    await expect(page.getByText('Hiển thị 1–7 / 7 nhóm')).toBeVisible();
    await expect(page.getByText('OPC Huế – Cà phê', { exact: true })).toBeVisible();
  });

  test('sửa nhóm giữ dữ liệu và lưu', async ({ page }) => {
    await openGroups(page);
    await page
      .locator('article')
      .filter({ has: page.getByText('OPC Đà Nẵng', { exact: true }) })
      .getByText('Sửa')
      .click();
    await expect(sheet(page)).toContainText('Chỉnh sửa nhóm cộng đồng');
    const name = sheet(page).getByPlaceholder('VD: OPC Đà Nẵng');
    await expect(name).toHaveValue('OPC Đà Nẵng');
    await name.fill('OPC Đà Nẵng Mới');
    await sheet(page).getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(toast(page)).toHaveText('Đã cập nhật nhóm OPC Đà Nẵng Mới');
    await expect(page.getByText('OPC Đà Nẵng Mới', { exact: true })).toBeVisible();
  });

  test('D-111 Quản lý chủ đề: đổi tên, trùng tên báo lỗi, "Chung" khoá, xoá có xác nhận', async ({
    page,
  }) => {
    await openGroups(page);
    await page
      .locator('article')
      .filter({ has: page.getByText('OPC Hà Nội', { exact: true }) })
      .getByText('Sửa')
      .click();
    await sheet(page).getByRole('button', { name: 'Quản lý chủ đề' }).click();
    const box = page.getByRole('dialog', { name: 'Chủ đề hiện có' });
    const rows = box.getByTestId('topic-row');
    const nameOf = (i: number) => rows.nth(i).getByRole('textbox', { name: 'Tên chủ đề' });
    await expect(rows).toHaveCount(4);
    await expect(nameOf(0)).toHaveValue('Chung');
    await expect(nameOf(3)).toHaveValue('Cà phê cuối tuần');
    // "Chung" chỉ đổi mô tả, không có nút Xoá
    await expect(nameOf(0)).toHaveAttribute('readonly', '');
    await expect(rows.nth(0).getByRole('button', { name: 'Xoá' })).toHaveCount(0);
    await expect(rows.nth(0)).toContainText('Mặc định');
    // Trùng tên chủ đề khác → 409
    await nameOf(1).fill('Chia sẻ mẫu biểu');
    await rows.nth(1).getByRole('button', { name: 'Lưu' }).click();
    await expect(toast(page)).toHaveText('Chủ đề này đã có trong nhóm');
    await nameOf(1).fill('Hỏi đáp thuế');
    await rows.nth(1).getByRole('button', { name: 'Lưu' }).click();
    await expect(toast(page)).toHaveText('Đã lưu chủ đề Hỏi đáp thuế');
    await expect(nameOf(1)).toHaveValue('Hỏi đáp thuế');
    // Xoá → hộp xác nhận → chủ đề biến mất khỏi danh sách
    await rows.nth(3).getByRole('button', { name: 'Xoá' }).click();
    await expect(confirmBox(page)).toContainText('# Cà phê cuối tuần');
    await confirmBox(page).getByRole('button', { name: 'Xóa', exact: true }).click();
    await expect(toast(page)).toHaveText('Đã xoá chủ đề Cà phê cuối tuần');
    await expect(rows).toHaveCount(3);
    await expect(box.getByRole('textbox', { name: 'Tên chủ đề' }).last()).toHaveValue(
      'Chia sẻ mẫu biểu',
    );
  });

  test('chọn nhiều → xóa có xác nhận; Xuất CSV mở hộp xuất', async ({ page }) => {
    await openGroups(page);
    await page.getByTitle('Dạng danh sách').click();
    await page.getByRole('checkbox', { name: 'Chọn OPC Hà Nội', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Chọn OPC Đà Nẵng', exact: true }).click();
    await expect(page.getByText('Đã chọn 2 mục')).toBeVisible();

    await page.getByRole('button', { name: 'Xuất CSV' }).click();
    const dlg = page.getByRole('dialog', { name: 'Xuất danh sách thành viên nhóm' });
    await expect(dlg).toContainText('8 dòng · 2 nhóm · hiển thị 6 dòng đầu');
    await expect(dlg.getByRole('button', { name: /Tải xuống 8 dòng/ })).toBeVisible();
    const download = page.waitForEvent('download');
    await dlg.getByRole('button', { name: /Tải xuống/ }).click();
    expect((await download).suggestedFilename()).toMatch(/^opchub-thanh-vien-nhom-\d{8}\.csv$/);
    await expect(toast(page)).toContainText('Đã xuất 8 dòng');

    await page.getByRole('checkbox', { name: 'Chọn OPC Hà Nội', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Chọn OPC Đà Nẵng', exact: true }).click();
    await page.getByRole('button', { name: 'Xóa nhóm' }).click();
    await expect(confirmBox(page)).toContainText('2 nhóm');
    await confirmBox(page).getByRole('button', { name: 'Huỷ', exact: true }).last().click();
    await expect(page.getByText('Hiển thị 1–12 / 90 nhóm')).toBeVisible();
    await page.getByRole('button', { name: 'Xóa nhóm' }).click();
    await confirmBox(page).getByRole('button', { name: 'Xóa', exact: true }).click();
    await expect(toast(page)).toHaveText('Đã xóa 2 nhóm');
    await expect(page.getByText('Hiển thị 1–12 / 88 nhóm')).toBeVisible();
  });

  test('Xem chat mở trình xem chỉ đọc (D-26)', async ({ page }) => {
    await openGroups(page);
    await page
      .locator('article')
      .filter({ has: page.getByText('OPC Hà Nội', { exact: true }) })
      .getByText('Xem chat')
      .click();
    await expect(page).toHaveURL(/\/groups\/c1\/chat$/);
    await expect(page.getByText('Xem chat · OPC Hà Nội')).toBeVisible();
    await expect(page.getByRole('button', { name: '# Chung' })).toBeVisible();
    await expect(page.locator('textarea, input[type=text]')).toHaveCount(0);
  });

  test('kiểm duyệt: lọc nguồn, Khôi phục tin tới rỗng (V4-612)', async ({ page }) => {
    await openGroups(page);
    await page.getByRole('tab', { name: /Kiểm duyệt tin nhắn/ }).click();
    await expect(page).toHaveURL(/tab=mod/);
    await expect(page.getByText('4 chờ xử lý')).toBeVisible();
    await expect(page.getByText('Đã ẩn tự động', { exact: true })).toHaveCount(4);

    await page.getByRole('radio', { name: 'Tự động' }).click();
    await expect(page.getByText('Bộ lọc tự động phát hiện')).toHaveCount(2);
    await page.getByRole('radio', { name: 'Báo cáo' }).click();
    await expect(page.getByText(/thành viên báo cáo$/)).toHaveCount(2);
    await page.getByRole('radio', { name: 'Tất cả' }).click();

    // Chờ từng lần Khôi phục xong (số chờ giảm) rồi mới bấm tiếp — không bấm dồn khi request chưa về
    for (const left of [3, 2, 1, 0]) {
      await page.getByRole('button', { name: 'Khôi phục tin' }).first().click();
      await expect(page.getByText(`${left} chờ xử lý`)).toBeVisible();
    }
    await expect(page.getByText('Không còn tin nhắn nhạy cảm cần xử lý.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ẩn & xóa' })).toHaveCount(0);
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
