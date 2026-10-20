import { test, expect } from '../server/test';
import type { Page } from '@playwright/test';
import { PORTAL_URL } from '../urls';

async function signIn(page: Page, email: string) {
  await page.goto(`${PORTAL_URL}/login`);
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.goto(`${PORTAL_URL}/affiliate`);
}

test.describe('Affiliate Portal — màn và tài khoản nhận', () => {
  test('REQ-302 chưa đóng phí thấy preview, không bị overlay che; nút mở thanh toán', async ({
    page,
  }) => {
    await signIn(page, 'do.haiyen@opchub.vn');
    await expect(
      page.getByRole('heading', { name: 'Đóng phí thành viên để nhận link giới thiệu' }),
    ).toBeVisible();
    await expect(page.getByText(/bạn nhận 20% hoa hồng \(120.000đ\)/)).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Link giới thiệu của bạn', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Thanh toán phí thành viên', exact: true }).click();
    await expect(page).toHaveURL(/\/membership\/pay$/);
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('REQ-309 REQ-311 sửa STK kiểm lỗi tại ô, chuẩn hóa tên, lưu và tải lại giữ dữ liệu', async ({
    page,
  }) => {
    await signIn(page, 'an.nguyen@mediasoft.vn');
    await expect(
      page.getByRole('heading', { name: 'Giới thiệu thành viên mới, nhận 20% hoa hồng' }),
    ).toBeVisible();
    await expect(page.getByText('OPCAN26', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Sửa', exact: true }).click();
    await page.getByLabel('Số tài khoản', { exact: true }).fill('12');
    await page.getByRole('button', { name: 'Lưu tài khoản' }).click();
    await expect(page.getByLabel('Số tài khoản', { exact: true })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await page.getByLabel('Ngân hàng', { exact: true }).selectOption('ACB');
    await page.getByLabel('Số tài khoản', { exact: true }).fill('246813579');
    await page.getByLabel('Tên chủ tài khoản', { exact: true }).fill('nguyễn văn an');
    await expect(page.getByLabel('Tên chủ tài khoản', { exact: true })).toHaveValue(
      'NGUYEN VAN AN',
    );
    await page.getByRole('button', { name: 'Lưu tài khoản' }).click();
    await expect(page.getByText('Đã lưu tài khoản nhận hoa hồng', { exact: true })).toBeVisible();
    await expect(page.getByText('ACB · 246813579', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('ACB · 246813579', { exact: true })).toBeVisible();
  });

  test('REQ-311 tab và tháng theo URL, F5 giữ nguyên; các kênh chia sẻ dùng URL đã encode', async ({
    page,
  }) => {
    await signIn(page, 'an.nguyen@mediasoft.vn');
    await page.getByRole('tab', { name: /Lịch sử nhận tiền/ }).click();
    await expect(page).toHaveURL(/tab=hist/);
    await page.reload();
    await expect(page.getByRole('tab', { name: /Lịch sử nhận tiền/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(
      page.getByText('Hoa hồng được chuyển khoản 1 lần vào ngày cuối mỗi tháng', { exact: true }),
    ).toBeVisible();
    const facebook = page.getByRole('link', { name: 'Chia sẻ Facebook', exact: true });
    const fbUrl = new URL((await facebook.getAttribute('href')) ?? '');
    expect(fbUrl.origin).toBe('https://www.facebook.com');
    expect(new URL(fbUrl.searchParams.get('u') ?? '').pathname).toBe('/r/OPCAN26');
    await page.goto(`${PORTAL_URL}/affiliate?month=2026-09`);
    await expect(page.getByRole('combobox', { name: 'Tháng 09/2026' })).toHaveValue('2026-09');
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Tháng 09/2026' })).toHaveValue('2026-09');
  });
});
