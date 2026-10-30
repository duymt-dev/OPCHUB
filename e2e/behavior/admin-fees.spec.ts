import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL } from '../urls';
import { onServer, simulateTransfer } from '../server/api';

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
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('admin@opchub.community');
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
    await expect(page.getByText('13.200.000đ')).toBeVisible();

    // D-94 2A / D-116: không còn khoản chờ thanh toán mới; m6 (tham gia 11/06/2026, chưa đóng phí)
    // đã hết 3 tháng miễn phí → Hết hạn (prototype `fst`)
    await page.getByRole('radio', { name: /^Chờ thanh toán/ }).click();
    await expect(page).toHaveURL(/status=pending/);
    await expect(row(page, 'Đỗ Hải Yến')).toHaveCount(0);

    await page.getByRole('radio', { name: /^Hết hạn/ }).click();
    await expect(page).toHaveURL(/status=expired/);
    await expect(row(page, 'Ngô Thành Đạt')).toBeVisible();
    await expect(row(page, 'Đỗ Hải Yến')).toBeVisible();

    // v4.2: tab "Miễn phí 3 tháng" (trial) — seed không có ai đang trong 3 tháng miễn phí
    await page.getByRole('radio', { name: /^Miễn phí 3 tháng/ }).click();
    await expect(page).toHaveURL(/status=trial/);
    await expect(page.getByText('Không có thành viên phù hợp')).toBeVisible();

    await page.getByRole('radio', { name: /^Tất cả/ }).click();
    await page.getByPlaceholder('Tìm tên, email...').fill('solobooks');
    await expect(page).toHaveURL(/q=solobooks/);
    await expect(table(page).getByRole('row')).toHaveCount(2);
    await expect(row(page, 'Trần Quốc Bảo')).toBeVisible();

    await page.getByPlaceholder('Tìm tên, email...').fill('zzzz');
    await expect(page.getByText('Không có thành viên phù hợp')).toBeVisible();
  });

  test('REQ-616 v4.6: 6 thẻ, 7 tab gồm miễn GĐ Vùng, cột Tên / Email / Nhóm tham gia', async ({
    page,
  }) => {
    await openFees(page);
    for (const label of [
      'Tổng thành viên',
      'Đã đóng phí (còn hiệu lực)',
      'Đang miễn phí 3 tháng',
      'Hết hạn · cần nâng cấp',
      'Sắp hết hạn (30 ngày)',
      'Doanh thu phí năm',
    ])
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    const tabs = page
      .getByRole('radiogroup', { name: 'Lọc theo trạng thái phí' })
      .getByRole('radio');
    await expect(tabs).toHaveText([
      /^Tất cả\s*10$/,
      /^Đang hiệu lực\s*5$/,
      /^Miễn phí 3 tháng\s*0$/,
      /^Miễn phí · GĐ Vùng\s*3$/,
      /^Chờ thanh toán\s*0$/,
      /^Sắp hết hạn\s*0$/,
      /^Hết hạn\s*2$/,
    ]);
    const head = table(page).getByRole('columnheader');
    await expect(head.nth(1)).toHaveText('Tên thành viên');
    await expect(head.nth(2)).toHaveText('Email thành viên');
    await expect(head.nth(3)).toHaveText('Nhóm tham gia');
    await expect(row(page, 'Đỗ Hải Yến').getByRole('cell').nth(3)).toHaveText(
      'OPC Khánh HòaOPC TP. Hồ Chí Minh',
    );
  });

  test('ghi nhận đã thu → Đang hiệu lực, số liệu cập nhật', async ({ page }) => {
    await openFees(page);
    const yen = row(page, 'Đỗ Hải Yến');
    await yen.getByRole('button', { name: 'Ghi nhận đã thu' }).click();
    await expect(toast(page)).toHaveText('Đã ghi nhận thu 1.200.000đ · Đỗ Hải Yến');
    await expect(yen.getByText('Đang hiệu lực')).toBeVisible();
    await expect(yen.getByRole('button', { name: 'Gia hạn 12 tháng' })).toBeVisible();
    await expect(page.getByRole('radio', { name: /^Chờ thanh toán/ })).toHaveText(
      'Chờ thanh toán0',
    );
    await expect(page.getByText('14.400.000đ')).toBeVisible();
  });

  test('REQ-204 D-63 TD-033 gửi nhắc dòng + hàng loạt; chọn nhiều → thu, nhắc, xuất CSV', async ({
    page,
  }) => {
    await openFees(page);
    await row(page, 'Ngô Thành Đạt').getByRole('button', { name: 'Gửi nhắc' }).click();
    await expect(toast(page)).toHaveText('Đã gửi email nhắc thanh toán tới dat.ngo@gmail.com');
    await page.getByRole('button', { name: 'Gửi nhắc hàng loạt' }).click();
    // D-120 / Q-B62-16: bỏ GĐ Vùng và TK bị khoá; chỉ Yến cần nhắc hàng loạt.
    await expect(toast(page)).toHaveText('Đã gửi email nhắc tới 1 thành viên');

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
    await expect(toast(page)).toHaveText('Đã ghi nhận thu phí cho 2 thành viên');
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
    await expect(yen.getByText('Hết hạn', { exact: true })).toBeVisible();
  });

  test('UAT-10 BUG-014 REQ-203 giao dịch sai nội dung → khớp tay → biến khỏi danh sách, TV Đang hiệu lực', async ({
    page,
  }) => {
    const CONTENT = 'CHUYEN KHOAN SAI NOI DUNG';
    // Server: ngân hàng giả báo tiền vào, không có Mã TV → hàng "Cần đối soát"; MSW: dữ liệu mẫu
    if (onServer) await simulateTransfer(CONTENT);
    await openFees(page);
    await page.getByRole('link', { name: /^Giao dịch cần đối soát/ }).click();
    await expect(page).toHaveURL(/\/fees\/transactions$/);
    const txns = page.locator('[data-m="txn-tbl"]');
    const txn = txns.getByRole('row').filter({ hasText: CONTENT });
    await expect(txn).toHaveCount(1);
    await expect(txn).toContainText('1.200.000đ');
    await expect(txn).toContainText('Không tìm thấy Mã TV trong nội dung');

    await txn.getByRole('button', { name: 'Khớp tay' }).click();
    const dlg = page.getByRole('dialog', { name: 'Khớp tay giao dịch' });
    await dlg.getByPlaceholder('Tìm tên, email hoặc Mã TV...').fill('Đỗ Hải');
    await dlg.getByRole('button', { name: /Đỗ Hải Yến/ }).click();
    await expect(dlg.getByTestId('match-member')).toContainText('Đỗ Hải Yến');
    await expect(dlg.getByRole('button', { name: 'Tiếp tục' })).toBeDisabled();
    await dlg.getByLabel('Lý do').fill('Khách gọi xác nhận, đối chiếu sao kê');
    await dlg.getByRole('button', { name: 'Tiếp tục' }).click();
    await expect(dlg.getByRole('alert')).toHaveText('Khớp giao dịch 1.200.000đ cho Đỗ Hải Yến?');
    await dlg.getByRole('button', { name: 'Khớp giao dịch' }).click();
    await expect(toast(page)).toHaveText(
      /^Đã khớp giao dịch cho Đỗ Hải Yến · hiệu lực đến \d{2}\/\d{2}\/\d{4}$/,
    );
    await expect(dlg).toBeHidden();
    await expect(txn).toHaveCount(0);

    await page.getByRole('link', { name: 'Về Phí thành viên' }).click();
    await expect(row(page, 'Đỗ Hải Yến').getByText('Đang hiệu lực')).toBeVisible();
  });

  test('phân trang 6 / trang → trang 2, giữ trên URL', async ({ page }) => {
    await openFees(page);
    await page.getByRole('combobox', { name: 'Số dòng mỗi trang' }).selectOption('6');
    await expect(table(page).getByRole('row')).toHaveCount(7);
    await page.getByRole('button', { name: 'Trang 2' }).click();
    await expect(page.getByText('Hiển thị 7–10 / 10 thành viên')).toBeVisible();
    await expect(page).toHaveURL(/page=2/);
    await expect(page).toHaveURL(/size=6/);
    await expect(row(page, 'Rina Sari')).toBeVisible();
    await expect(row(page, 'Hoàng Gia Linh')).toBeVisible();
    await expect(row(page, 'Lê Minh Hải')).toBeVisible();
    await expect(row(page, 'Phạm Thu Hà')).toBeVisible();
  });
});
