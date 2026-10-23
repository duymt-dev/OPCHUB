import { test, expect } from '../server/test';
import type { Page } from '@playwright/test';
import { PORTAL_URL } from '../urls';

test.use({ affiliateDemo: true });

async function signIn(page: Page, email: string) {
  await page.goto(`${PORTAL_URL}/login`);
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.goto(`${PORTAL_URL}/affiliate`);
}

test.describe('Affiliate Portal — màn và tài khoản nhận', () => {
  test('REQ-311 AF0 lịch sử có dữ liệu và ngân hàng nhận tiền giữ snapshot', async ({ page }) => {
    await signIn(page, 'an.nguyen@mediasoft.vn');
    await expect(page.getByText('412', { exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Đỗ Minh T.', exact: true })).toBeVisible();
    await expect(page.getByText('3 khách', { exact: true })).toBeVisible();
    await page.getByRole('tab', { name: /Lịch sử nhận tiền/ }).click();
    await expect(page.getByText('Tổng đã nhận · 2 kỳ', { exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Tháng 09/2026', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Tháng 08/2026', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: /Vietcombank/ })).toHaveCount(2);
    await expect(page.locator('.ant-pagination')).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: /kỳ chi trả/ })).toHaveCount(0);
  });

  test('REQ-311 HAOPC phân trang dữ liệu thật, URL và F5 giữ trang; đổi tháng về trang một', async ({
    page,
  }) => {
    await signIn(page, 'ha.le@opcmedia.vn');
    await expect(page.getByText('HAOPC', { exact: true })).toBeVisible();
    await page.getByRole('combobox').filter({ visible: true }).selectOption('2026-09');
    await expect(page.getByText('7 khách', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Trang 2', exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(
      page.getByRole('navigation', { name: 'Hiển thị 7–7 / 7 lượt giới thiệu' }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Trang 2', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(
      page.getByRole('navigation', { name: 'Hiển thị 7–7 / 7 lượt giới thiệu' }),
    ).toBeVisible();
    await page.getByRole('combobox').filter({ visible: true }).selectOption('2026-10');
    await expect(page).not.toHaveURL(/page=2/);
    await expect(page.getByText('5 khách', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Trang 1', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

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
    // hero Affiliate (cùng nhãn với nút ở thẻ gói chân sidebar — TIP-V4-606)
    await page
      .getByRole('main')
      .getByRole('button', { name: 'Thanh toán phí thành viên', exact: true })
      .click();
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
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: 'Sao chép', exact: true }).click();
    await expect(page.getByText('Đã sao chép link giới thiệu', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      fbUrl.searchParams.get('u'),
    );
    await page.getByRole('button', { name: 'Sao chép mã', exact: true }).click();
    await expect(page.getByText('Đã sao chép mã giới thiệu', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('OPCAN26');
    await page.goto(`${PORTAL_URL}/affiliate?month=2026-09`);
    await expect(page.getByRole('combobox', { name: 'Tháng 09/2026' })).toHaveValue('2026-09');
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Tháng 09/2026' })).toHaveValue('2026-09');
  });
});
