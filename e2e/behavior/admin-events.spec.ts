import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ADMIN_URL } from '../urls';

/** G5a — D-42 → D-50: Admin "Nội dung & Sự kiện" (app mới, MSW) */

const SEARCH = 'Tìm sự kiện...';
const MEETUP = 'OPC Meetup #12 – Vận hành doanh nghiệp một mình';

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });
const sheet = (page: Page) => page.getByRole('dialog');
const card = (page: Page, title: string) => page.locator('article').filter({ hasText: title });

async function openEvents(page: Page) {
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.locator('aside').getByText('Nội dung & Sự kiện', { exact: true }).click();
  await expect(page.getByText('Hiển thị 1–5 / 5 sự kiện')).toBeVisible();
}

test.describe('Admin · Nội dung & Sự kiện', () => {
  test('lọc trạng thái, hình thức, tìm, kiểu xem, phân trang — trạng thái trên URL', async ({
    page,
  }) => {
    await openEvents(page);
    await expect(page.getByText('391', { exact: true })).toBeVisible();
    await expect(page.getByText('67%', { exact: true })).toBeVisible();

    await page.getByRole('tab', { name: 'Đã đầy' }).click();
    await expect(page.getByText('Hiển thị 1–1 / 1 sự kiện')).toBeVisible();
    await expect(page).toHaveURL(/status=full/);
    await page.getByRole('tab', { name: 'Sắp đầy' }).click();
    await expect(page.getByText('Hiển thị 1–2 / 2 sự kiện')).toBeVisible();
    await page.getByRole('tab', { name: 'Tất cả' }).click();

    await page.getByLabel('Hình thức').selectOption({ label: 'Online' });
    await expect(page.getByText('Hiển thị 1–2 / 2 sự kiện')).toBeVisible();
    await expect(page).toHaveURL(/mode=online/);
    await page.getByLabel('Hình thức').selectOption({ label: 'Mọi hình thức' });

    await page.getByPlaceholder(SEARCH).fill('hà nội');
    await expect(page.getByText('Hiển thị 1–2 / 2 sự kiện')).toBeVisible();
    await page.getByPlaceholder(SEARCH).fill('zzzz');
    await expect(page.getByText('Không có sự kiện phù hợp.')).toBeVisible();
    await page.getByPlaceholder(SEARCH).fill('');

    await page.getByLabel('Số sự kiện mỗi trang').selectOption('6');
    await expect(page).toHaveURL(/size=6/);
    await expect(page.getByText('Hiển thị 1–5 / 5 sự kiện')).toBeVisible();
    // Mở thẳng URL trang 2 (điều hướng phía client để giữ phiên trong bộ nhớ):
    // chỉ 5 sự kiện → kẹp về trang 1
    await page.evaluate(() => {
      window.history.pushState(null, '', '/events?size=6&page=2');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(page.getByText('Hiển thị 1–5 / 5 sự kiện')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Trang 2' })).toHaveCount(0);

    await page.getByTitle('Dạng danh sách').click();
    await expect(page).toHaveURL(/view=list/);
    await expect(page.getByRole('table', { name: 'Danh sách sự kiện' })).toBeVisible();
    await expect(page.locator('article')).toHaveCount(0);
  });

  test('tạo sự kiện online + sửa sự kiện offline', async ({ page }) => {
    await openEvents(page);
    await page.getByRole('button', { name: /^\+?\s*Tạo sự kiện$/ }).click();
    const form = sheet(page);
    await expect(form.getByText('Tạo sự kiện mới')).toBeVisible();
    await form.getByRole('button', { name: 'Lưu sự kiện' }).click();
    await expect(toast(page)).toHaveText('Vui lòng nhập tên sự kiện');

    await form.getByPlaceholder('VD: OPC Meetup #13').fill('Webinar Thuế cuối năm');
    await form.locator('input[type=date]').fill('2026-11-20');
    await form.getByRole('radio', { name: 'Online' }).click();
    await form.getByRole('button', { name: 'Lưu sự kiện' }).click();
    await expect(toast(page)).toHaveText('Vui lòng nhập link tham gia');
    await form.getByPlaceholder('https://zoom.us/j/...').fill('https://zoom.us/j/123');
    await form.getByRole('button', { name: 'Lưu sự kiện' }).click();
    await expect(toast(page)).toHaveText('Đã tạo sự kiện Webinar Thuế cuối năm');
    await expect(sheet(page)).toHaveCount(0);
    await expect(page.getByText('Hiển thị 1–6 / 6 sự kiện')).toBeVisible();
    await expect(card(page, 'Webinar Thuế cuối năm')).toContainText('T6, 20/11 · 19:00');

    await card(page, MEETUP).getByRole('button', { name: 'Chỉnh sửa' }).click();
    await expect(form.getByText('Chỉnh sửa sự kiện')).toBeVisible();
    await expect(form.getByText('Hiện tại: T5, 22/10')).toBeVisible();
    await form.getByPlaceholder('VD: OPC Meetup #13').fill('OPC Meetup #12 (dời giờ)');
    await form.getByRole('switch').click();
    await form.getByRole('button', { name: 'Lưu sự kiện' }).click();
    await expect(toast(page)).toHaveText('Đã cập nhật sự kiện');
    await expect(card(page, 'OPC Meetup #12 (dời giờ)')).toContainText('Đã đóng đăng ký');
  });

  test('danh sách đăng ký: check-in từng người, check-in tất cả, xuất CSV', async ({ page }) => {
    await openEvents(page);
    await card(page, MEETUP).getByRole('button', { name: 'Danh sách' }).click();
    const drawer = sheet(page);
    await expect(drawer.getByText('Đã check-in 0/7')).toBeVisible();
    await expect(drawer.getByText('54/80 chỗ')).toBeVisible();

    await drawer.getByRole('button', { name: 'Check-in', exact: true }).first().click();
    await expect(drawer.getByText('Đã check-in 1/7')).toBeVisible();
    await expect(drawer.getByRole('button', { name: '✓ Đã check-in' })).toHaveCount(1);
    // bấm lại để bỏ check-in
    await drawer.getByRole('button', { name: '✓ Đã check-in' }).click();
    await expect(drawer.getByText('Đã check-in 0/7')).toBeVisible();

    await drawer.getByRole('button', { name: 'Check-in tất cả' }).click();
    await expect(drawer.getByText('Đã check-in 7/7')).toBeVisible();

    const download = page.waitForEvent('download');
    await drawer.getByRole('button', { name: 'Xuất CSV' }).click();
    await expect(toast(page)).toHaveText('Đang xuất danh sách đăng ký…');
    expect((await download).suggestedFilename()).toBe('dang-ky-e1.csv');

    await page.keyboard.press('Escape');
    await expect(sheet(page)).toHaveCount(0);
  });

  test('chia sẻ: toast đã sao chép', async ({ page }) => {
    await openEvents(page);
    await card(page, MEETUP).getByRole('button', { name: 'Chia sẻ' }).click();
    await expect(toast(page)).toHaveText('Đã sao chép liên kết sự kiện');
  });
});
