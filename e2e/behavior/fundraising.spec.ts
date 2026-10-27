import { PRICE_DEFAULTS } from '@opchub/shared/fixtures';
import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL, PORTAL_URL } from '../urls';
import { onServer, simulateTransfer } from '../server/api';

/** V4-610 UP-11 · AD-06 (D-82 → D-88): Gói Gọi vốn — Bảng giá / sau đăng dự án → CK → Admin duyệt */

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });
const fundBox = (page: Page) => page.getByRole('dialog', { name: /^Thanh toán Gói Gọi vốn/ });

async function login(page: Page, origin: string, email: string, password: string) {
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[autocomplete=username], input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

const member = (page: Page) => login(page, PORTAL_URL, 'an.nguyen@mediasoft.vn', 'User@2026');

test.describe('Gói Gọi vốn', () => {
  test('Bảng giá → chọn dự án → mã GV → CK → webhook → Admin duyệt → tab Gọi vốn', async ({
    page,
    context,
  }) => {
    await member(page);
    await page.locator('aside').getByText('Bảng giá', { exact: true }).click();
    await page.getByRole('button', { name: 'Đăng ký · 15.000.000đ/dự án' }).click();
    const box = fundBox(page);
    // v4.2 (UI-PAY-01): 2 cột — "1. Chọn dự án" (thẻ, một dự án / khoản — D-94 4B) + "2. Chuyển khoản"
    await expect(box).toContainText('Thanh toán Gói Gọi vốn · 15.000.000đ / dự án / 6 tháng');
    await expect(box).toContainText('Chọn một dự án cần gọi vốn mỗi lần');
    // Q-V4-610-2: dự án gọi vốn từ trước V4 (legacy) vẫn mua được gói có phí như prototype
    const pick = box.getByRole('radiogroup', { name: 'Dự án gọi vốn' });
    await expect(pick.getByRole('radio', { name: /OPC Hub Mobile/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(box).toContainText('Đã chọn 1 dự án15.000.000đ / 6 tháng');
    // D-96: QR VietQR động trong khung cố định 200 × 200, chuỗi do server sinh (SVG, không ảnh ngoài)
    const qr = box.getByTestId('pay-qr');
    const card = qr.getByRole('img', { name: /^Mã VietQR chuyển khoản Gói Gọi vốn GV\d{6}$/ });
    await expect(card).toBeVisible();
    await expect(card.locator('svg')).toHaveCount(1);
    expect(await qr.evaluate((e) => [e.clientWidth, e.clientHeight])).toEqual([198, 198]);
    await expect(box).toContainText('Quét bằng app ngân hàng bất kỳ');
    // D-105 (§28.1): OPCHUB [Mã TV chủ] [SĐT] GV[mã] + dòng "Cấu trúc" như prototype v4.2
    const code = box.getByText(/^OPCHUB TV\d{6}( 0\d{9})? GV\d{6}$/);
    await expect(code).toBeVisible();
    await expect(box).toContainText('Cấu trúc: OPCHUB [Mã thành viên] [SĐT] GV[Mã dự án]');
    const content = (await code.textContent()) ?? '';
    await box.getByRole('button', { name: 'Sao chép' }).click();
    await expect(toast(page)).toHaveText('Đã sao chép nội dung chuyển khoản');

    const confirm = page.waitForRequest(
      (r) =>
        r.method() === 'POST' && /\/v1\/me\/fundraisings\/[^/]+\/transfer-confirm$/.test(r.url()),
    );
    await box.getByRole('button', { name: 'Tôi đã chuyển khoản' }).click();
    expect((await confirm).headers()['idempotency-key']).toBeTruthy();
    await expect(toast(page)).toHaveText(
      'Đã ghi nhận thanh toán · hồ sơ gọi vốn chuyển sang chờ Admin duyệt',
    );
    await expect(box).toBeHidden();
    // D-31: chỉ webhook ngân hàng mới chuyển sang chờ thẩm định
    if (onServer) {
      await simulateTransfer(content, PRICE_DEFAULTS.fund.p);
      await page.getByRole('button', { name: 'Thông báo' }).click();
      await expect(
        page.getByText('Đã nhận Gói Gọi vốn · chờ Admin thẩm định').first(),
      ).toBeVisible();
      await page.keyboard.press('Escape');
    } else {
      // MSW: webhook giả trễ ghi trạng thái vào cầu cookie dùng chung với Admin (cùng host)
      await expect
        .poll(async () =>
          decodeURIComponent(
            (await context.cookies(PORTAL_URL)).find((c) => c.name === 'opchub-mock-gv')?.value ??
              '',
          ),
        )
        .toContain('"status":"pending_review"');
    }

    const admin = await context.newPage();
    await login(admin, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    await admin.locator('aside').getByText('Dự án OPC', { exact: true }).click();
    await admin.getByRole('tab', { name: /^Đang hiển thị/ }).click();
    const row = admin.locator('article').filter({ hasText: 'OPC Hub Mobile' });
    await expect(row.getByText('Gọi vốn · chờ duyệt')).toBeVisible();
    await row.getByRole('button', { name: 'Duyệt gọi vốn' }).click();
    await expect(admin.getByRole('status').filter({ hasText: 'Đã duyệt gọi vốn' })).toHaveText(
      'Đã duyệt gọi vốn · ghi nhận hoa hồng Affiliate 10% (nếu có người giới thiệu)',
    );
    await expect(row.getByText('Đang gọi vốn')).toBeVisible();
    await expect(row.getByRole('button', { name: 'Duyệt gọi vốn' })).toHaveCount(0);

    // Đang có khoản có phí hiệu lực → không chọn lại được ở Bảng giá
    await page.goto(`${PORTAL_URL}/services`);
    await page.getByRole('button', { name: 'Đăng ký · 15.000.000đ/dự án' }).click();
    await expect(box).toContainText('Chưa có dự án nào bật “Cần gọi vốn đầu tư”.');
    await box.getByRole('button', { name: 'Tôi đã chuyển khoản' }).click();
    await expect(toast(page)).toHaveText('Vui lòng chọn ít nhất 1 dự án cần gọi vốn');
    await box.getByRole('button', { name: '+ Đăng dự án mới' }).click();
    await expect(box).toBeHidden();
    await expect(page).toHaveURL(/\/projects\/mine/);

    await page.goto(`${PORTAL_URL}/projects/p10?tab=fund`);
    await expect(page.getByRole('tab', { name: 'Gọi vốn đầu tư' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByText('Nhà đầu tư quan tâm (2)')).toBeVisible();
  });

  test('đăng dự án có gọi vốn → popup thanh toán ngay (không chọn dự án), × đóng', async ({
    page,
  }) => {
    await member(page);
    await page.goto(`${PORTAL_URL}/projects`);
    await page.getByRole('button', { name: /Đăng dự án của bạn/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Đăng dự án mới' });
    await sheet.getByPlaceholder('VD: SoloBooks – Kế toán cho OPC').fill('Dự án gọi vốn thử');
    await sheet
      .getByRole('combobox', { name: /Nhóm ngành giải pháp/ })
      .selectOption({ label: 'Thủy sản' });
    await sheet.getByPlaceholder('Một câu giới thiệu dự án của bạn').fill('Thử Gói Gọi vốn');
    await sheet.getByPlaceholder('https://demo.duan-cua-ban.app').fill('https://demo.thu.app');
    await sheet.getByRole('switch', { name: /Dự án đang tìm kiếm đầu tư/ }).click();
    await sheet.getByPlaceholder('2000000000').fill('500000000');
    await sheet.getByLabel(/Cổ phần chào bán/).fill('5');
    await sheet.getByRole('button', { name: 'Gửi đăng dự án' }).click();

    const box = fundBox(page);
    await expect(box).toContainText(
      'Dự án Dự án gọi vốn thử · phần Gọi vốn hiển thị sau khi thanh toán và Admin thẩm định.',
    );
    await expect(box.getByRole('radiogroup')).toHaveCount(0);
    await expect(box.getByText(/^OPCHUB TV\d{6}( 0\d{9})? GV\d{6}$/)).toBeVisible();
    // UI-PAY-04: × góc đóng popup
    await box.getByRole('button', { name: 'Đóng' }).click();
    await expect(box).toBeHidden();

    await expect(page.getByText('Dự án gọi vốn thử', { exact: true })).toBeVisible();
  });

  test('D-113 F3 CK Gọi vốn thiếu Mã TV → Admin khớp tay vào khoản chờ thanh toán → chờ duyệt', async ({
    page,
    context,
  }) => {
    await member(page);
    await page.locator('aside').getByText('Bảng giá', { exact: true }).click();
    await page.getByRole('button', { name: 'Đăng ký · 15.000.000đ/dự án' }).click();
    const box = fundBox(page);
    const code = box.getByText(/^OPCHUB TV\d{6}( 0\d{9})? GV\d{6}$/);
    await expect(code).toBeVisible();
    const gv = ((await code.textContent()) ?? '').split(' ').at(-1) ?? '';
    await box.getByRole('button', { name: 'Quay lại' }).click();
    // Khách chỉ ghi mã GV (nội dung cũ, Q-V42-704-3) → không tự khớp. MSW: dòng mẫu `OPCHUB GV000001`
    const content = `OPCHUB ${gv}`;
    if (onServer) await simulateTransfer(content, PRICE_DEFAULTS.fund.p);

    const admin = await context.newPage();
    await login(admin, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    await admin.goto(`${ADMIN_URL}/fees/transactions`, { waitUntil: 'networkidle' });
    const txn = admin.locator('[data-m="txn-tbl"]').getByRole('row').filter({ hasText: content });
    await expect(txn).toContainText('Không tìm thấy Mã TV trong nội dung');
    await expect(txn).toContainText(gv);
    await txn.getByRole('button', { name: 'Khớp tay' }).click();
    const dlg = admin.getByRole('dialog', { name: 'Khớp tay giao dịch' });
    // Nội dung có mã GV → mặc định khớp vào Gói Gọi vốn, ô tìm điền sẵn mã
    await expect(dlg.getByRole('radio', { name: 'Gói Gọi vốn' })).toBeChecked();
    await dlg.getByRole('button', { name: new RegExp(`^${gv} · OPC Hub Mobile`) }).click();
    await expect(dlg.getByTestId('match-fundraising')).toHaveText(
      `Đã chọn: ${gv} · OPC Hub Mobile`,
    );
    await dlg.getByLabel('Lý do').fill('Khách chuyển thiếu Mã TV, đối chiếu sao kê');
    await dlg.getByRole('button', { name: 'Tiếp tục' }).click();
    await expect(dlg.getByRole('alert')).toHaveText(
      `Khớp giao dịch 15.000.000đ cho ${gv} · OPC Hub Mobile?`,
    );
    await dlg.getByRole('button', { name: 'Khớp giao dịch' }).click();
    await expect(toast(admin)).toHaveText(
      `Đã khớp giao dịch vào Gói Gọi vốn ${gv} · chờ Admin thẩm định`,
    );
    await expect(txn).toHaveCount(0);

    await admin.locator('aside').getByText('Dự án OPC', { exact: true }).click();
    await admin.getByRole('tab', { name: /^Đang hiển thị/ }).click();
    const row = admin.locator('article').filter({ hasText: 'OPC Hub Mobile' });
    await expect(row.getByText('Gọi vốn · chờ duyệt')).toBeVisible();
  });
});
