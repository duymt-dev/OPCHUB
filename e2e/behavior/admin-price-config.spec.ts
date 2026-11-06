import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL } from '../urls';

/**
 * TIP-V42-703 (D-94 5A, REQ-603, prototype `stPrice` / `prcV`): Admin › Cài đặt › Cấu hình bảng giá —
 * sửa → "Hủy thay đổi", xem trước giá tháng + % ưu đãi + cảnh báo, chặn giá bán trống / thời hạn 0,
 * lưu → toast + Nhật ký hoạt động (luật 10).
 */

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });
const box = (page: Page, name: string) =>
  page.locator('[data-plan]').filter({ hasText: name }).first();

async function openPrice(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.goto(`${ADMIN_URL}/settings?tab=price`, { waitUntil: 'networkidle' });
  await expect(page.getByText('Cấu hình bảng giá').last()).toBeVisible();
}

test.describe('Admin · Cấu hình bảng giá', () => {
  test('tab nằm sau SMTP; giá mặc định + xem trước theo prototype', async ({ page }) => {
    await openPrice(page);
    const nav = page.getByRole('navigation', { name: 'Mục cài đặt' }).getByRole('button');
    const names = await nav.allInnerTexts();
    const i = names.findIndex((n) => n.includes('Cấu hình bảng giá'));
    expect(names[i - 1]).toContain('Gửi email (SMTP)');
    expect(names[i + 1]).toContain('Nhắc gia hạn');
    expect(names[i + 2]).toContain('Đối soát ngân hàng');
    expect(names[i + 3]).toContain('Tài khoản quản trị');
    const per = box(page, 'Gói Cá nhân');
    await expect(per.getByLabel('Giá niêm yết / tháng (đ)')).toHaveValue('200000');
    await expect(per.getByLabel('Giá bán / năm (đ)')).toHaveValue('1200000');
    await expect(per).toContainText('Hiển thị gạch ngang · 2.400.000đ/năm');
    await expect(per).toContainText('Hiển thị trên Bảng giá:100.000đ/tháng');
    await expect(per).toContainText('Ưu đãi 50%');
    await expect(box(page, 'Gói Doanh nghiệp')).toContainText('Ưu đãi 40%');
    await expect(page.getByText('Hoa hồng Affiliate 10% trên Gói Gọi vốn:')).toContainText(
      '1.500.000đ / dự án.',
    );
    await expect(page.getByRole('button', { name: 'Hủy thay đổi' })).toHaveCount(0);
  });

  test('sửa → cảnh báo + "Hủy thay đổi"; giá trống / thời hạn 0 bị chặn', async ({ page }) => {
    await openPrice(page);
    const per = box(page, 'Gói Cá nhân');
    await per.getByLabel('Giá niêm yết / tháng (đ)').fill('50.000đ');
    await expect(per.getByLabel('Giá niêm yết / tháng (đ)')).toHaveValue('50000');
    await expect(per.getByText('Giá bán theo tháng đang cao hơn giá niêm yết.')).toBeVisible();
    await expect(per).toContainText('Ưu đãi 0%');
    await page.getByRole('button', { name: 'Hủy thay đổi' }).click();
    await expect(per.getByLabel('Giá niêm yết / tháng (đ)')).toHaveValue('200000');
    await expect(page.getByRole('button', { name: 'Hủy thay đổi' })).toHaveCount(0);
    await box(page, 'Gói Doanh nghiệp').getByLabel('Giá bán / năm (đ)').fill('');
    await page.getByRole('button', { name: 'Lưu bảng giá' }).click();
    await expect(toast(page)).toHaveText('Giá bán không được để trống');
    await page.getByRole('button', { name: 'Hủy thay đổi' }).click();
    await page.getByLabel('Thời hạn (tháng)').fill('0');
    await page.getByRole('button', { name: 'Lưu bảng giá' }).click();
    await expect(toast(page)).toHaveText('Thời hạn gói Gọi vốn tối thiểu 1 tháng');
  });

  test('lưu → toast, nháp xoá, Nhật ký ghi "Cập nhật bảng giá"', async ({ page }) => {
    await openPrice(page);
    await box(page, 'Gói Cá nhân').getByLabel('Giá bán / năm (đ)').fill('1500000');
    await expect(box(page, 'Gói Cá nhân')).toContainText('125.000đ/tháng');
    await page.getByLabel('Giá / dự án (đ)').fill('18000000');
    await expect(page.getByText('Hoa hồng Affiliate 10% trên Gói Gọi vốn:')).toContainText(
      '1.800.000đ / dự án.',
    );
    await page.getByRole('button', { name: 'Lưu bảng giá' }).click();
    await expect(toast(page)).toHaveText(
      'Đã lưu bảng giá · áp dụng ngay cho trang Bảng giá và thanh toán mới',
    );
    await expect(page.getByRole('button', { name: 'Hủy thay đổi' })).toHaveCount(0);
    await page
      .getByRole('navigation', { name: 'Mục cài đặt' })
      .getByRole('button')
      .filter({ hasText: 'Nhật ký hoạt động' })
      .click();
    await expect(page.getByText('Cập nhật bảng giá').first()).toBeVisible();
    await expect(page.getByText('Bảng giá', { exact: true }).first()).toBeVisible();
  });
});
