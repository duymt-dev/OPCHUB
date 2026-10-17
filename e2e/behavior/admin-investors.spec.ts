import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL } from '../urls';

/** G5c — D-58 → D-60 Nhà đầu tư (Admin): lọc loại + tìm (URL), phân trang, drawer, trao đổi */

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });
const table = (page: Page) => page.locator('[data-m="tbl"]');
const row = (page: Page, name: string) => table(page).getByRole('row').filter({ hasText: name });
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Thông tin nhà đầu tư' });

async function openInvestors(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.locator('aside').getByText('Nhà đầu tư', { exact: true }).click();
  await expect(
    page.getByText('Quỹ và cá nhân đã bày tỏ quan tâm đầu tư vào các dự án OPC'),
  ).toBeVisible();
  await expect(row(page, 'Somchai Prasert')).toBeVisible();
}

test.describe('Admin · Nhà đầu tư', () => {
  test('thống kê, lọc loại + tìm ghi lên URL, trống', async ({ page }) => {
    await openInvestors(page);
    await expect(page.getByText('1,8 tỷ ₫')).toBeVisible();
    await expect(table(page).getByRole('row')).toHaveCount(5);

    await page.getByRole('radio', { name: /^Quỹ đầu tư/ }).click();
    await expect(page).toHaveURL(/kind=fund/);
    await expect(table(page).getByRole('row')).toHaveCount(3);
    await expect(row(page, 'Rina Sari')).toBeVisible();
    await expect(row(page, 'Somchai Prasert')).toHaveCount(0);

    await page.getByRole('radio', { name: /^Tất cả/ }).click();
    await page.getByPlaceholder('Tìm tên, doanh nghiệp, quỹ, số điện thoại...').fill('sao mai');
    await expect(page).toHaveURL(/q=sao/);
    await expect(table(page).getByRole('row')).toHaveCount(2);
    await expect(row(page, 'Trần Thị Mai')).toBeVisible();

    await page.getByPlaceholder('Tìm tên, doanh nghiệp, quỹ, số điện thoại...').fill('zzzz');
    await expect(page.getByText('Không có nhà đầu tư phù hợp')).toBeVisible();
  });

  test('phân trang: cỡ trang + tab cùng giữ trên URL', async ({ page }) => {
    await openInvestors(page);
    await expect(page.getByText('Hiển thị 1–4 / 4 nhà đầu tư')).toBeVisible();
    await page.getByRole('combobox', { name: 'Số dòng mỗi trang' }).selectOption('6');
    await expect(page).toHaveURL(/size=6/);
    await page.getByRole('radio', { name: /^Doanh nghiệp/ }).click();
    await expect(page).toHaveURL(/kind=business&size=6|size=6&kind=business|kind=business.*size=6/);
    await expect(page.getByText('Hiển thị 1–1 / 1 nhà đầu tư')).toBeVisible();
  });

  test('drawer: đổi trạng thái kết nối, gửi bình luận → Đang trao đổi', async ({ page }) => {
    await openInvestors(page);
    await row(page, 'Trần Thị Mai').getByRole('button', { name: 'Chi tiết' }).click();
    const d = drawer(page);
    await expect(d.getByText('Dự án đã quan tâm (1)')).toBeVisible();
    await expect(d.getByRole('radio', { name: 'Đã gửi' })).toHaveAttribute('aria-checked', 'true');
    await expect(d.getByText('Chưa có trao đổi.', { exact: false })).toBeVisible();

    const box = d.getByPlaceholder('Viết bình luận cho nhà đầu tư… (Enter để gửi)');
    await box.fill('Chào chị Mai, bên em gửi lịch gặp.');
    await box.press('Enter');
    await expect(toast(page)).toHaveText('Đã gửi tới Trần Thị Mai');
    await expect(d.getByText('Chào chị Mai, bên em gửi lịch gặp.')).toBeVisible();
    await expect(d.getByRole('radio', { name: 'Đang trao đổi' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await d.getByRole('radio', { name: 'Đã kết nối' }).click();
    await expect(toast(page)).toHaveText('Trần Thị Mai → Đã kết nối');
    await page.keyboard.press('Escape');
    await expect(d).toBeHidden();
    await expect(row(page, 'Trần Thị Mai').getByText('Đã kết nối')).toBeVisible();
  });

  test('xuất CSV theo bộ lọc', async ({ page }) => {
    await openInvestors(page);
    await page.getByRole('radio', { name: /^Quỹ đầu tư/ }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Xuất CSV' }).click();
    expect((await download).suggestedFilename()).toBe('nha-dau-tu.csv');
    await expect(toast(page)).toHaveText('Đã xuất 2 nhà đầu tư');
  });
});
