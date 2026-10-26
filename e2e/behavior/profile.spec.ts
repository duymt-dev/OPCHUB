import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { PORTAL_URL } from '../urls';
import { extraSessions, onServer, payFee, setGroupOwner } from '../server/api';

/** G3c — P-89 → P-95: Hồ sơ cá nhân (app mới, MSW) */

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });

async function openProfile(page: Page) {
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  // Ver2: "Hồ sơ cá nhân" nằm trong menu người dùng ở topbar
  await page.locator('[data-m="me"]').click();
  await page.getByRole('menuitem', { name: 'Hồ sơ cá nhân' }).click();
  await expect(page.getByRole('button', { name: 'Lưu thay đổi' })).toBeVisible();
}

test.describe('Hồ sơ cá nhân', () => {
  test('lưu thông tin: báo lỗi, hoàn tác, lưu thành công cập nhật tên trên khung', async ({
    page,
  }) => {
    await openProfile(page);
    const name = page.getByPlaceholder('Nguyễn Văn An', { exact: true });
    await name.fill('');
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(toast(page)).toHaveText('Họ và tên không được để trống');

    await page.getByRole('button', { name: 'Hoàn tác' }).click();
    await expect(name).toHaveValue('Nguyễn Văn An');

    await name.fill('Nguyễn Văn Bình');
    await page.getByPlaceholder('VD: Hà Nội').fill('Hà Nội');
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(toast(page)).toHaveText('Đã lưu hồ sơ – thông tin trong Admin đã được cập nhật');
    await expect(page.getByRole('heading', { name: 'Nguyễn Văn Bình' })).toBeVisible();
    // ver2: tên người dùng ở menu tài khoản trên topbar
    await expect(page.locator('[data-m="me"]').getByText('Nguyễn Văn Bình')).toBeVisible();
  });

  test('tab trên URL; DN đã xác minh khoá MST (D-40)', async ({ page }) => {
    await openProfile(page);
    await page.getByRole('tab', { name: 'Thông tin doanh nghiệp' }).click();
    await expect(page).toHaveURL(/tab=business/);
    await expect(page.getByTitle(/Doanh nghiệp đã được xác minh/)).toBeVisible();
    const tax = page.getByLabel('Mã số thuế');
    await expect(tax).toHaveValue('0101234567');
    await expect(tax).toHaveAttribute('readonly', '');
    await expect(page.getByLabel('Website')).not.toHaveAttribute('readonly', '');

    await page.getByRole('tab', { name: 'Bảo mật' }).click();
    await expect(page).toHaveURL(/tab=security/);
    await page.getByRole('tab', { name: 'Thông tin cá nhân' }).click();
    await expect(page).not.toHaveURL(/tab=/);
  });

  test('nhóm & hoạt động: bấm số Nhóm, rời nhóm giảm số', async ({ page }) => {
    // D-43 / Q-B20-1: An là chủ OPC Hà Nội trên API thật → Admin chuyển chủ trước khi rời
    if (onServer) await setGroupOwner('c1', 'm2');
    await openProfile(page);
    await page.getByRole('button', { name: /^3\s*Nhóm$/ }).click();
    await expect(page).toHaveURL(/tab=activity/);
    await expect(page.getByText('Nhóm đã tham gia')).toBeVisible();
    await expect(
      page.locator('main').getByText('Workshop: Tự động hoá bán hàng bằng AI'),
    ).toBeVisible();
    const row = page
      .locator('div')
      .filter({ hasText: /^HNOPC Hà Nội/ })
      .last();
    await row.getByRole('button', { name: 'Rời nhóm' }).click();
    await expect(toast(page)).toHaveText('Đã rời OPC Hà Nội');
    await expect(page.getByRole('button', { name: /^2\s*Nhóm$/ })).toBeVisible();
  });

  test('bảo mật: đổi mật khẩu, độ mạnh, SSO, đăng xuất thiết bị khác', async ({ page }) => {
    await openProfile(page);
    await page.getByRole('tab', { name: 'Bảo mật' }).click();
    const submit = page.getByRole('button', { name: 'Cập nhật mật khẩu' });
    await submit.click();
    await expect(toast(page)).toHaveText('Nhập mật khẩu hiện tại');

    const pw = page.locator('input[type=password]');
    await pw.nth(0).fill('User@2026');
    await pw.nth(1).fill('abc');
    await expect(page.getByText('Rất yếu')).toBeVisible();
    await submit.click();
    await expect(toast(page)).toHaveText('Mật khẩu mới chưa đủ mạnh');

    await pw.nth(1).fill('Opchub@2026');
    await expect(page.getByText('Mạnh', { exact: true })).toBeVisible();
    await pw.nth(2).fill('khac');
    await submit.click();
    await expect(toast(page)).toHaveText('Xác nhận mật khẩu không khớp');
    await pw.nth(2).fill('Opchub@2026');
    await submit.click();
    await expect(toast(page)).toHaveText('Đã cập nhật mật khẩu');
    await expect(pw.nth(0)).toHaveValue('');

    const fb = page
      .locator('div')
      .filter({ hasText: /^Facebook/ })
      .last();
    await fb.getByRole('button', { name: 'Liên kết' }).click();
    await expect(toast(page)).toHaveText('Đã liên kết Facebook');
    await expect(fb.getByText('Đã liên kết')).toBeVisible();

    // MSW trả số cố định; API thật đếm phiên thật → đăng nhập thêm 2 thiết bị (mật khẩu mới)
    if (onServer) await extraSessions('an.nguyen@mediasoft.vn', 'Opchub@2026', 2);
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).last().click();
    await expect(toast(page)).toHaveText('Đã đăng xuất khỏi 2 thiết bị khác');
  });

  test('BUG-030 đổi email qua hộp OTP', async ({ page }) => {
    await openProfile(page);
    const email = page.getByPlaceholder('ban@congty.vn');
    await expect(email).toHaveValue('an.nguyen@mediasoft.vn');
    await expect(email).toHaveAttribute('readonly', '');

    await page.getByRole('button', { name: 'Đổi email' }).click();
    const box = page.getByRole('dialog', { name: 'Đổi email đăng nhập' });
    await expect(
      box.getByText('Email hiện tại: an.nguyen@mediasoft.vn', { exact: false }),
    ).toBeVisible();
    const input = box.getByPlaceholder('email.moi@congty.vn');
    await input.fill('sai');
    await box.getByRole('button', { name: 'Gửi mã OTP' }).click();
    await expect(box.getByRole('alert')).toHaveText('Email không hợp lệ');
    // Email đã thuộc TK khác → 409 hiện trong hộp
    await input.fill('minhanh@leadpilot.ai');
    await box.getByRole('button', { name: 'Gửi mã OTP' }).click();
    await expect(box.getByRole('alert')).toHaveText('Email đã được sử dụng cho tài khoản khác');

    const next = 'an.moi@mediasoft.vn';
    await input.fill(next);
    await box.getByRole('button', { name: 'Gửi mã OTP' }).click();
    await expect(toast(page)).toHaveText(`Đã gửi mã OTP 6 số tới ${next}`);
    const otp = page.getByRole('dialog', { name: 'Xác nhận email mới' });
    await expect(otp.getByText(next)).toBeVisible();
    await otp.getByLabel('Mã OTP').fill('000000');
    await otp.getByRole('button', { name: 'Xác nhận đổi email' }).click();
    await expect(otp.getByRole('alert')).toHaveText('Mã OTP không đúng');
    // OTP cố định dev/test (MSW MOCK_OTP, server OTP_FIXED_CODE)
    await otp.getByLabel('Mã OTP').fill('123456');
    await otp.getByRole('button', { name: 'Xác nhận đổi email' }).click();
    await expect(toast(page)).toHaveText(`Đã đổi email đăng nhập thành ${next}`);
    await expect(otp).toHaveCount(0);
    await expect(email).toHaveValue(next);
    // Thẻ Liên hệ đọc lại hồ sơ (cache /me) — email mới
    await expect(page.getByText(next, { exact: true }).first()).toBeVisible();
  });

  test('BUG-030 nút huỷ SSO cuối bị khoá khi chưa có mật khẩu', async ({ page, context }) => {
    if (onServer) {
      // TK SSO thật (FakeSso: sso.member@gmail.com, chỉ liên kết Google, không mật khẩu)
      await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /Google/ }).click();
      await page.getByRole('button', { name: /^Cá nhân/ }).click();
      await page.getByRole('button', { name: /OPC Hà Nội/ }).click();
      await page.getByText(/^Tôi xác nhận là người đại diện hợp pháp/).click();
      await page.getByRole('button', { name: 'Hoàn tất và vào cộng đồng' }).click();
      await expect(page).toHaveURL(/\/community$/);
      await payFee(page);
      await page.goto(`${PORTAL_URL}/profile?tab=security`, { waitUntil: 'networkidle' });
    } else {
      // MSW: cookie biến TK An thành TK chỉ liên kết Google, chưa đặt mật khẩu
      await context.addCookies([{ name: 'opchub-mock-sso-only', value: '1', url: PORTAL_URL }]);
      await openProfile(page);
      await page.getByRole('tab', { name: 'Bảo mật' }).click();
    }
    await expect(page.getByText('Tài khoản liên kết')).toBeVisible();
    const google = page
      .locator('div')
      .filter({ hasText: /^Google/ })
      .last();
    await expect(google.getByText('Đã liên kết')).toBeVisible();
    const unlink = google.getByRole('button', { name: 'Huỷ liên kết' });
    await expect(unlink).toBeDisabled();
    await expect(unlink).toHaveAttribute('title', 'Đặt mật khẩu trước khi huỷ liên kết cuối cùng');
    await expect(
      page.getByText('Đặt mật khẩu trước khi huỷ liên kết cuối cùng').first(),
    ).toBeVisible();
  });
});
