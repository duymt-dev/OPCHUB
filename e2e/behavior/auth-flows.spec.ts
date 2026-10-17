import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { PORTAL_URL } from '../urls';
import { closeRegistration, onServer } from '../server/api';

/** G1.7 — đăng ký cá nhân/DN, OTP, quên mật khẩu, đổi ngôn ngữ (app mới, MSW) */

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });

async function openRegister(page: Page, kind: 'Doanh nghiệp' | 'Cá nhân') {
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Đăng ký' }).click();
  await expect(page.getByText('BẠN ĐĂNG KÝ VỚI TƯ CÁCH')).toBeVisible();
  await page.getByRole('button', { name: new RegExp(`^${kind}`) }).click();
}

async function enterOtp(page: Page, code: string) {
  await page.getByLabel('Mã OTP').fill(code);
  await page.getByRole('button', { name: 'Xác nhận & kích hoạt tài khoản' }).click();
}

test.describe('Đăng ký cá nhân + OTP', () => {
  test('thiếu vai trò → báo; đủ → OTP; sai/đủ số → kích hoạt vào /community (D-30)', async ({
    page,
  }) => {
    await openRegister(page, 'Cá nhân');
    await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
    await expect(toast(page)).toHaveText('Vui lòng chọn vai trò khi tham gia');

    await page.getByPlaceholder('Nguyễn Văn An').fill('Người Test');
    await page.getByRole('radio', { name: /Chuyên gia/ }).click();
    await expect(page.getByText('Đã chọn 2 nhóm')).toBeVisible();
    await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
    await expect(toast(page)).toHaveText('Vui lòng nhập email hợp lệ để nhận mã OTP');

    await page.getByPlaceholder('ban@congty.vn').fill('test@x.vn');
    await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Xác thực email' });
    await expect(dialog).toContainText('test@x.vn');

    await enterOtp(page, '123');
    await expect(dialog.getByRole('alert')).toHaveText('Vui lòng nhập đủ 6 chữ số');
    await enterOtp(page, '000000');
    await expect(dialog.getByRole('alert')).toHaveText('Mã OTP không đúng');

    await dialog.getByRole('button', { name: 'Gửi lại' }).click();
    await expect(toast(page)).toHaveText('Đã gửi lại mã OTP tới test@x.vn');

    await enterOtp(page, '123456');
    await expect(page).toHaveURL(/\/community$/);
  });
});

test.describe('Đăng ký doanh nghiệp (tra MST)', () => {
  test('MST sai → báo; đúng → tự điền; bỏ ngành phụ; thiếu nhóm → báo', async ({ page }) => {
    await openRegister(page, 'Doanh nghiệp');
    await page.getByRole('button', { name: 'Đăng ký doanh nghiệp' }).click();
    await expect(toast(page)).toHaveText('Vui lòng nhập mã số thuế');

    const tax = page.getByPlaceholder('VD: 0101234567');
    await tax.fill('123');
    await page.getByRole('button', { name: 'Tra cứu' }).click();
    await expect(toast(page)).toHaveText('Mã số thuế gồm 10 hoặc 13 chữ số');

    await tax.fill('0101234567');
    await expect(page.getByText(/Đã tìm thấy doanh nghiệp/)).toBeVisible();
    await expect(page.getByPlaceholder('Công ty TNHH ...')).toHaveValue(
      'Công ty TNHH Giải pháp MediaSoft',
    );
    await expect(page.getByText('Ngành nghề đăng ký khác (4)')).toBeVisible();
    await page.getByRole('button', { name: /^Bỏ ngành 6202/ }).click();
    await expect(page.getByText('Ngành nghề đăng ký khác (3)')).toBeVisible();

    await page.getByRole('button', { name: 'Đăng ký doanh nghiệp' }).click();
    await expect(toast(page)).toHaveText('Vui lòng chọn ít nhất 1 nhóm');

    await page.getByRole('button', { name: /OPC Hà Nội/ }).click();
    await page.getByPlaceholder('lienhe@congty.vn').fill('lienhe@mediasoft.vn');
    await page.getByRole('button', { name: 'Đăng ký doanh nghiệp' }).click();
    await expect(page.getByRole('dialog', { name: 'Xác thực email' })).toBeVisible();
  });

  test('đổi mã quốc gia SĐT', async ({ page }) => {
    await openRegister(page, 'Doanh nghiệp');
    await page.getByRole('button', { name: 'Mã quốc gia' }).click();
    await page
      .getByRole('listbox', { name: 'Mã quốc gia' })
      .getByRole('option', { name: /Singapore/ })
      .click();
    await expect(page.getByRole('button', { name: 'Mã quốc gia' })).toContainText('+65');
  });

  test('đăng ký đang tạm đóng → chỉ báo, không sang form (A-11)', async ({ page, context }) => {
    // API thật: tắt Mở đăng ký trong Cài đặt chung; MSW: cookie giả
    if (onServer) await closeRegistration();
    else
      await context.addCookies([{ name: 'opchub-mock-reg-closed', value: '1', url: PORTAL_URL }]);
    await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'Đăng ký' }).click();
    await expect(toast(page)).toHaveText('Đăng ký mới đang tạm đóng');
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('Quên mật khẩu', () => {
  test('gửi liên kết → "Đã gửi email"; về đăng nhập', async ({ page }) => {
    await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Quên mật khẩu?' }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
    await page.getByRole('button', { name: 'Gửi liên kết đặt lại' }).click();
    await expect(page.getByText('Đã gửi email')).toBeVisible();
    await expect(toast(page)).toHaveText('Đã gửi liên kết đặt lại mật khẩu');
    await page.getByRole('button', { name: 'Về đăng nhập' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('Đổi ngôn ngữ', () => {
  test('chọn English → chữ màn đăng nhập đổi, giữ sau tải lại', async ({ page }) => {
    await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Tiếng Việt/ }).click();
    await expect(page.getByText('CHỌN QUỐC GIA & NGÔN NGỮ')).toBeVisible();
    await page.getByRole('option', { name: /Toàn cầu/ }).click();
    await expect(page.getByText('Remember me')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByRole('button', { name: /English/ })).toBeVisible();
  });
});

test.describe('SSO thành viên mới (D-45)', () => {
  test('Google → form bổ sung → vào /community, không OTP', async ({ page }) => {
    await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Google/ }).click();
    await expect(toast(page)).toHaveText('Đang chuyển hướng tới Google…');
    await expect(page.getByText('Hoàn tất đăng ký')).toBeVisible();
    await page.getByRole('button', { name: /^Cá nhân/ }).click();
    await page.getByRole('button', { name: /OPC Hà Nội/ }).click();
    await page.getByRole('button', { name: 'Hoàn tất và vào cộng đồng' }).click();
    await expect(page).toHaveURL(/\/community$/);
  });
});
