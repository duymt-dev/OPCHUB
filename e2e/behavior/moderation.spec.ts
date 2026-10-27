import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { onServer } from '../server/api';
import { ADMIN_URL, PORTAL_URL } from '../urls';

/**
 * TIP-V4-612 (D-77, D-83, §26.6): Kiểm duyệt — tin vi phạm ẩn ngay, đếm vi phạm, "Khóa N ngày",
 * "Khôi phục tin", "Thời gian khóa" (Admin); tin trúng từ khoá thành dòng "đã bị ẩn" (Portal).
 * Chạy trên MSW (kho mock riêng từng app); bản server đã có test:int `test/moderation/violations`.
 */

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });
const HIDDEN = 'Tin nhắn đã bị ẩn do vi phạm nội quy cộng đồng.';

async function openModeration(page: Page) {
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.locator('aside').getByText('Nhóm cộng đồng', { exact: true }).click();
  await page.getByRole('tab', { name: /Kiểm duyệt tin nhắn/ }).click();
  await expect(page.getByText('4 chờ xử lý')).toBeVisible();
}
const card = (page: Page, name: string) =>
  page.locator('article').filter({ has: page.getByText(name, { exact: true }) });

test.describe('Kiểm duyệt §26.6 (V4-612)', () => {
  test.skip(onServer, 'Kho mock MSW; bản server: test:int moderation/violations');

  test('Admin: Thời gian khóa 14 ngày → nút + quy tắc theo; Khóa 14 ngày; Khôi phục tin', async ({
    page,
  }) => {
    await openModeration(page);
    await expect(page.getByText('Quy tắc xử lý vi phạm')).toBeVisible();
    await expect(page.getByText(/tự động khóa tài khoản 7 ngày/)).toBeVisible();

    // Trần Quốc Bảo: vi phạm lần 1, chưa khoá → có nút "Khóa 7 ngày"
    const bao = card(page, 'Trần Quốc Bảo');
    await expect(bao.getByText('Vi phạm lần 1')).toBeVisible();
    await expect(bao.getByRole('button', { name: 'Khóa 7 ngày' })).toBeVisible();
    // Ngô Thành Đạt đã khoá thủ công sẵn (seed prototype) → không có nút khoá
    await expect(card(page, 'Ngô Thành Đạt').getByRole('button', { name: /^Khóa / })).toHaveCount(
      0,
    );

    await page.getByLabel('Thời gian khóa').selectOption('14');
    await expect(toast(page)).toHaveText('Thời gian khóa: 14 ngày');
    await expect(page.getByText(/tự động khóa tài khoản 14 ngày/)).toBeVisible();
    // Rời tab rồi quay lại: đọc lại GET /admin/moderation/settings (kho MSW sống theo trang)
    await page.getByRole('tab', { name: /^Danh sách nhóm/ }).click();
    await page.getByRole('tab', { name: /Kiểm duyệt tin nhắn/ }).click();
    await expect(page.getByLabel('Thời gian khóa')).toHaveValue('14');

    await bao.getByRole('button', { name: 'Khóa 14 ngày' }).click();
    await expect(toast(page)).toHaveText('Đã khóa Trần Quốc Bảo 14 ngày');
    await expect(page.getByText('3 chờ xử lý')).toBeVisible();
    await expect(bao).toHaveCount(0);

    await card(page, 'Vũ Đức Long').getByRole('button', { name: 'Khôi phục tin' }).click();
    await expect(toast(page)).toHaveText(
      'Đã khôi phục tin nhắn của Vũ Đức Long · không tính vi phạm',
    );
    await expect(page.getByText('2 chờ xử lý')).toBeVisible();
  });

  test('Portal: tin trúng từ khoá ẩn ngay thành dòng giữ chỗ; tin thường vẫn hiện', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
    await page
      .locator('input[autocomplete=username], input[type=email]')
      .fill('an.nguyen@mediasoft.vn');
    await page.locator('input[type=password]').fill('User@2026');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    await page.locator('aside').getByText('Chat nhóm', { exact: true }).click();
    await expect(page.getByText('Enter để gửi')).toBeVisible();
    const composer = page.getByPlaceholder(/^Nhắn tin trong #/);
    const rows = page.locator('[role="option"]');
    const ok = 'Chào cả nhà, tin bình thường';

    await composer.fill(ok);
    await composer.press('Enter');
    await expect(rows.filter({ hasText: ok })).toHaveCount(1);

    const bad = 'Ai cần vay nóng thì liên hệ mình';
    const hiddenBefore = await rows.filter({ hasText: HIDDEN }).count();
    await composer.fill(bad);
    await composer.press('Enter');
    // D-77: tin trúng từ khoá thành dòng giữ chỗ ngay dưới tin thường; nội dung gốc không hiện
    await expect(rows.filter({ hasText: HIDDEN })).toHaveCount(hiddenBefore + 1);
    await expect(rows.last()).toHaveText(HIDDEN);
    await expect(rows.filter({ hasText: bad })).toHaveCount(0);
    await expect(rows.filter({ hasText: ok })).toHaveCount(1);
    // Tin đã ẩn không chọn được (không cảm xúc / trả lời / báo cáo)
    await rows.last().click();
    await expect(page.getByRole('button', { name: 'Trả lời', exact: true })).toHaveCount(0);
  });
});
