import { expect, test } from '../server/test';
import type { Locator, Page } from '../server/test';
import { ADMIN_URL } from '../urls';

/** G4d — D-36 → D-41: Bot tương tác (Admin, MSW) */

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });

async function openBots(page: Page) {
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/overview$/);
  await page.locator('aside').getByText('Bot tương tác', { exact: true }).click();
  await expect(page).toHaveURL(/\/bots$/);
  await expect(page.getByText('Bot tương tác cộng đồng')).toBeVisible();
}

const tab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true }).click();
const stat = (page: Page, label: string) =>
  page.getByText(label, { exact: true }).first().locator('xpath=following-sibling::b');
/** Thẻ nhỏ nhất chứa chữ `text` và nút `action` */
const card = (page: Page, text: string, action: string): Locator =>
  page
    .locator('div')
    .filter({ hasText: text })
    .filter({ has: page.getByRole('button', { name: action, exact: true }) })
    .last();
const drawer = (page: Page, name: string) => page.getByRole('dialog', { name });

test.describe('Bot tương tác', () => {
  test('công tắc chế độ tự động và tuỳ chọn; tab nằm trên URL', async ({ page }) => {
    await openBots(page);
    await expect(
      page.getByText('Đang khởi động… hoạt động tự động sẽ hiện tại đây.'),
    ).toBeVisible();
    const auto = page.getByRole('switch', { name: 'Chế độ tự động', exact: true });
    await expect(auto).toHaveAttribute('aria-checked', 'true');
    await auto.click();
    await expect(auto).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByText('Đã tạm dừng')).toBeVisible();
    const gen = page.getByRole('switch', { name: 'Tự sinh kịch bản từ chủ đề' });
    await gen.click();
    await expect(gen).toHaveAttribute('aria-checked', 'false');

    await tab(page, 'Persona');
    await expect(page).toHaveURL(/\/bots\/personas$/);
    await expect(page.getByRole('tab', { name: 'Persona', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await tab(page, 'Hội thoại');
    await expect(page).toHaveURL(/\/bots\/threads$/);
    // Phiên đăng nhập ở bộ nhớ nên không tải lại trang; Back của trình duyệt về đúng tab
    await page.goBack();
    await expect(page).toHaveURL(/\/bots\/personas$/);
    await expect(page.getByRole('tab', { name: 'Persona', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('persona: bật/tắt, tạo, sửa, xoá có xác nhận', async ({ page }) => {
    await openBots(page);
    await expect(stat(page, 'Persona đang hoạt động')).toHaveText('5 / 6');
    await tab(page, 'Persona');
    await page.getByRole('switch', { name: 'Bật/tắt persona Đỗ Anh Tuấn' }).click();
    await expect(stat(page, 'Persona đang hoạt động')).toHaveText('6 / 6');

    await page.getByRole('button', { name: '+ Tạo persona' }).click();
    await expect(page).toHaveURL(/\/bots\/personas\/new$/);
    const d = drawer(page, 'Persona');
    await d.getByRole('button', { name: 'Lưu persona' }).click();
    await expect(toast(page)).toHaveText('Nhập tên persona');
    await d.getByPlaceholder('Nguyễn Văn A').fill('Bùi Minh Châu');
    await d.getByPlaceholder('VD: Chủ shop online').fill('Nhà thiết kế UX');
    await d.getByLabel('Tỉnh / thành').selectOption('Huế');
    await d.getByPlaceholder('Thuế, Marketing, AI').fill('UX, Figma');
    await d.getByRole('button', { name: 'Lưu persona' }).click();
    await expect(toast(page)).toHaveText('Chọn ít nhất 1 nhóm tham gia');
    await d.getByRole('button', { name: 'OPC Hà Nội', exact: true }).click();
    await d.getByRole('button', { name: 'Lưu persona' }).click();
    await expect(toast(page)).toHaveText('Đã lưu persona');
    await expect(page).toHaveURL(/\/bots\/personas$/);
    await expect(page.getByText('Bùi Minh Châu')).toBeVisible();
    await expect(stat(page, 'Persona đang hoạt động')).toHaveText('7 / 7');

    await card(page, 'Bùi Minh Châu', 'Sửa').getByRole('button', { name: 'Sửa' }).click();
    await expect(page).toHaveURL(/\/bots\/personas\/ps\d+$/);
    await drawer(page, 'Persona').getByPlaceholder('Nguyễn Văn A').fill('Bùi Minh Châu (sửa)');
    await drawer(page, 'Persona').getByRole('button', { name: 'Lưu persona' }).click();
    await expect(page.getByText('Bùi Minh Châu (sửa)')).toBeVisible();

    await card(page, 'Bùi Minh Châu (sửa)', 'Xóa').getByRole('button', { name: 'Xóa' }).click();
    const confirm = page.getByRole('dialog', { name: 'Xóa persona?' });
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Hủy' }).click();
    await expect(confirm).toHaveCount(0);
    await expect(page.getByText('Bùi Minh Châu (sửa)', { exact: true })).toBeVisible();
    await card(page, 'Bùi Minh Châu (sửa)', 'Xóa').getByRole('button', { name: 'Xóa' }).click();
    await page
      .getByRole('dialog', { name: 'Xóa persona?' })
      .getByRole('button', { name: 'Xóa' })
      .click();
    await expect(toast(page)).toHaveText('Đã xóa persona');
    await expect(page.getByText('Bùi Minh Châu (sửa)', { exact: true })).toHaveCount(0);
  });

  test('kịch bản: tạo với lượt ↑↓×, xem trước, sửa, xoá', async ({ page }) => {
    await openBots(page);
    await tab(page, 'Kịch bản hội thoại');
    await page.getByRole('button', { name: '+ Tạo kịch bản' }).click();
    await expect(page).toHaveURL(/\/bots\/scripts\/new$/);
    const d = drawer(page, 'Kịch bản hội thoại');
    await expect(d.getByText('Nhập nội dung các lượt để xem trước.')).toBeVisible();
    await d.getByRole('button', { name: 'Lưu kịch bản' }).click();
    await expect(toast(page)).toHaveText('Nhập chủ đề');
    await d.getByPlaceholder('VD: Thuế cho người mới lập OPC').fill('Chọn ngân hàng cho OPC');
    await d.getByRole('button', { name: 'OPC Đà Nẵng', exact: true }).click();
    await d.getByRole('button', { name: 'Lưu kịch bản' }).click();
    await expect(toast(page)).toHaveText('Thêm ít nhất 1 lượt hội thoại');

    await d.getByLabel('Nội dung lượt 1').fill('Câu hỏi A');
    await d.getByLabel('Nội dung lượt 2').fill('Trả lời B');
    await d.getByRole('button', { name: '+ Thêm lượt' }).click();
    await d.getByLabel('Nội dung lượt 3').fill('Lượt thừa');
    await d.getByRole('button', { name: 'Xóa' }).nth(2).click();
    await expect(d.getByLabel('Nội dung lượt 3')).toHaveCount(0);
    await d.getByRole('button', { name: 'Xuống' }).first().click();
    await expect(d.getByLabel('Nội dung lượt 1')).toHaveValue('Trả lời B');
    await d.getByRole('button', { name: 'Lên' }).nth(1).click();
    await expect(d.getByLabel('Nội dung lượt 1')).toHaveValue('Câu hỏi A');
    await expect(d.getByText('Câu hỏi A', { exact: true }).last()).toBeVisible();
    await d.getByRole('button', { name: 'Lưu kịch bản' }).click();
    await expect(toast(page)).toHaveText('Đã lưu kịch bản');
    await expect(page.getByText('Chọn ngân hàng cho OPC')).toBeVisible();
    await expect(stat(page, 'Kịch bản hội thoại')).toHaveText('4');

    await card(page, 'Chọn ngân hàng cho OPC', 'Sửa').getByRole('button', { name: 'Sửa' }).click();
    await expect(
      drawer(page, 'Kịch bản hội thoại').getByPlaceholder('VD: Thuế cho người mới lập OPC'),
    ).toHaveValue('Chọn ngân hàng cho OPC');
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/bots\/scripts$/);

    await card(page, 'Chọn ngân hàng cho OPC', 'Xóa').getByRole('button', { name: 'Xóa' }).click();
    await page
      .getByRole('dialog', { name: 'Xóa kịch bản?' })
      .getByRole('button', { name: 'Xóa' })
      .click();
    await expect(toast(page)).toHaveText('Đã xóa kịch bản');
    await expect(stat(page, 'Kịch bản hội thoại')).toHaveText('3');
  });

  test('chạy ngay → chờ duyệt; Duyệt & đăng; Bỏ; trống', async ({ page }) => {
    await openBots(page);
    await expect(stat(page, 'Chờ duyệt')).toHaveText('1');
    await tab(page, 'Kịch bản hội thoại');
    await card(page, 'Tìm khách hàng đầu tiên', 'Chạy ngay')
      .getByRole('button', { name: 'Chạy ngay' })
      .click();
    await expect(toast(page)).toHaveText('Đã tạo hội thoại – chờ duyệt');
    await expect(stat(page, 'Chờ duyệt')).toHaveText('2');
    await expect(
      card(page, 'Tìm khách hàng đầu tiên', 'Chạy ngay').getByText('2 lần chạy'),
    ).toBeVisible();

    await tab(page, 'Hội thoại');
    await page.getByRole('button', { name: 'Duyệt & đăng' }).first().click();
    await expect(toast(page)).toHaveText('Đã đăng vào 1 nhóm');
    await expect(stat(page, 'Chờ duyệt')).toHaveText('1');
    await expect(stat(page, 'Hội thoại đã đăng')).toHaveText('3');

    await page.getByRole('button', { name: 'Bỏ', exact: true }).click();
    await expect(toast(page)).toHaveText('Đã bỏ hội thoại');
    await expect(stat(page, 'Chờ duyệt')).toHaveText('0');
    await expect(page.getByRole('button', { name: 'Duyệt & đăng' })).toHaveCount(0);

    await tab(page, 'Nhật ký tự động');
    await expect(page.getByText(/Đã đăng “Tìm khách hàng đầu tiên” vào OPC Đà Nẵng/)).toBeVisible();
    await expect(page.getByText('2', { exact: true }).first()).toBeVisible();
  });

  test('tab Hội thoại trống khi đã xoá hết kịch bản', async ({ page }) => {
    await openBots(page);
    await tab(page, 'Kịch bản hội thoại');
    for (const topic of [
      'Thuế cho người mới lập OPC',
      'Tìm khách hàng đầu tiên',
      'Ứng dụng AI vào vận hành OPC',
    ]) {
      await card(page, topic, 'Xóa').getByRole('button', { name: 'Xóa' }).click();
      await page
        .getByRole('dialog', { name: 'Xóa kịch bản?' })
        .getByRole('button', { name: 'Xóa' })
        .click();
      await expect(page.getByText(topic, { exact: true })).toHaveCount(0);
    }
    await tab(page, 'Hội thoại');
    await expect(
      page.getByText('Chưa có hội thoại. Vào tab Kịch bản và bấm Chạy ngay.'),
    ).toBeVisible();
  });
});
