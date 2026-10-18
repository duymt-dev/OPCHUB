import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL } from '../urls';
import { onServer } from '../server/api';

/** G4b — D-18 → D-22 Phí thành viên (Admin): lọc tab, tìm, ghi nhận thu, gửi nhắc, phân trang */

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });
/** Thông điệp 409 của `membership-fee.service` (version phí đổi giữa chừng) */
const FEE_CONFLICT = 'Phí vừa được cập nhật bởi thao tác khác';
const table = (page: Page) => page.locator('[data-m="tbl"]');
const row = (page: Page, name: string) => table(page).getByRole('row').filter({ hasText: name });

async function openFees(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.locator('aside').getByText('Phí thành viên', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Phí thành viên hệ thống' })).toBeVisible();
  await expect(row(page, 'Nguyễn Văn An')).toBeVisible();
}

test.describe('Admin · Phí thành viên', () => {
  test('thống kê + lọc tab ghi lên URL; tìm không thấy → trống', async ({ page }) => {
    await openFees(page);
    await expect(page.getByText('Doanh thu phí năm')).toBeVisible();
    await expect(page.getByText('3.600.000đ')).toBeVisible();

    await page.getByRole('radio', { name: /^Chờ thanh toán/ }).click();
    await expect(page).toHaveURL(/status=pending/);
    await expect(table(page).getByRole('row')).toHaveCount(2);
    await expect(row(page, 'Đỗ Hải Yến')).toBeVisible();

    await page.getByRole('radio', { name: /^Hết hạn/ }).click();
    await expect(row(page, 'Ngô Thành Đạt')).toBeVisible();
    await expect(row(page, 'Đỗ Hải Yến')).toHaveCount(0);

    await page.getByRole('radio', { name: /^Tất cả/ }).click();
    await page.getByPlaceholder('Tìm tên, email...').fill('solobooks');
    await expect(page).toHaveURL(/q=solobooks/);
    await expect(table(page).getByRole('row')).toHaveCount(2);
    await expect(row(page, 'Trần Quốc Bảo')).toBeVisible();

    await page.getByPlaceholder('Tìm tên, email...').fill('zzzz');
    await expect(page.getByText('Không có thành viên phù hợp')).toBeVisible();
  });

  test('ghi nhận đã thu → Đang hiệu lực, số liệu cập nhật', async ({ page }) => {
    await openFees(page);
    const yen = row(page, 'Đỗ Hải Yến');
    await yen.getByRole('button', { name: 'Ghi nhận đã thu' }).click();
    await expect(toast(page)).toHaveText('Đã ghi nhận thu 600.000đ · Đỗ Hải Yến');
    await expect(yen.getByText('Đang hiệu lực')).toBeVisible();
    await expect(yen.getByRole('button', { name: 'Gia hạn 12 tháng' })).toBeVisible();
    await expect(page.getByRole('radio', { name: /^Chờ thanh toán/ })).toHaveText(
      'Chờ thanh toán0',
    );
    await expect(page.getByText('4.200.000đ')).toBeVisible();
  });

  test('gửi nhắc dòng + hàng loạt; chọn nhiều → thu, nhắc, xuất CSV', async ({ page }) => {
    await openFees(page);
    await row(page, 'Ngô Thành Đạt').getByRole('button', { name: 'Gửi nhắc' }).click();
    await expect(toast(page)).toHaveText('Đã gửi email nhắc thanh toán tới dat.ngo@gmail.com');
    await page.getByRole('button', { name: 'Gửi nhắc hàng loạt' }).click();
    // Q-B62-16: API thật không nhắc TK đã bị khoá (Ngô Thành Đạt) → 2; MSW đếm cả → 3
    await expect(toast(page)).toHaveText(`Đã gửi email nhắc tới ${onServer ? 2 : 3} thành viên`);

    await page.getByRole('checkbox', { name: 'Chọn Ngô Thành Đạt' }).click();
    await page.getByRole('checkbox', { name: 'Chọn Đỗ Hải Yến' }).click();
    const bar = page.getByRole('region', { name: 'Thao tác hàng loạt' });
    await expect(bar).toContainText('Đã chọn 2 thành viên');

    const download = page.waitForEvent('download');
    await bar.getByRole('button', { name: 'Xuất CSV' }).click();
    expect((await download).suggestedFilename()).toBe('phi-thanh-vien.csv');
    await expect(toast(page)).toHaveText('Đã xuất 2 thành viên');

    await bar.getByRole('button', { name: 'Gửi nhắc' }).click();
    await expect(toast(page)).toHaveText('Đã gửi email nhắc tới 2 thành viên');
    await expect(bar).toBeHidden();

    await page.getByRole('checkbox', { name: 'Chọn Ngô Thành Đạt' }).click();
    await page.getByRole('checkbox', { name: 'Chọn Đỗ Hải Yến' }).click();
    await bar.getByRole('button', { name: 'Ghi nhận đã thu' }).click();
    await expect(toast(page)).toHaveText('Đã ghi nhận thu 600.000đ cho 2 thành viên');
    await expect(row(page, 'Ngô Thành Đạt').getByText('Đang hiệu lực')).toBeVisible();
    await expect(row(page, 'Đỗ Hải Yến').getByText('Đang hiệu lực')).toBeVisible();
  });

  test('BUG-024 lỗi 409 hiện lý do server', async ({ page, context }) => {
    // V2Q-78: server cho active → active (gia hạn) nên không tái hiện 409 qua UI được.
    // MSW: cookie giả lập; server: chặn đúng route trả envelope 409 thật của server. Cùng assertion.
    if (onServer)
      await context.route('**/v1/admin/fees/*/collect', (route) =>
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: { code: 'CONFLICT', message: FEE_CONFLICT, requestId: 'e2e-bug-024' },
          }),
        }),
      );
    else
      await context.addCookies([{ name: 'opchub-mock-fee-conflict', value: '1', url: ADMIN_URL }]);
    await openFees(page);
    const yen = row(page, 'Đỗ Hải Yến');
    await yen.getByRole('button', { name: 'Ghi nhận đã thu' }).click();
    await expect(toast(page)).toHaveText(FEE_CONFLICT);
    await expect(yen.getByText('Chờ thanh toán')).toBeVisible();
  });

  test('phân trang 6 / trang → trang 2, giữ trên URL', async ({ page }) => {
    await openFees(page);
    await page.getByRole('combobox', { name: 'Số dòng mỗi trang' }).selectOption('6');
    await expect(table(page).getByRole('row')).toHaveCount(7);
    await page.getByRole('button', { name: 'Trang 2' }).click();
    await expect(page.getByText('Hiển thị 7–8 / 8 thành viên')).toBeVisible();
    await expect(page).toHaveURL(/page=2/);
    await expect(page).toHaveURL(/size=6/);
    await expect(row(page, 'Rina Sari')).toBeVisible();
    await expect(row(page, 'Hoàng Gia Linh')).toBeVisible();
  });
});
