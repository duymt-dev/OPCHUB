import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL, PORTAL_URL } from '../urls';
import { closeRegistration, onServer } from '../server/api';
import { lastMailTo, linkFrom } from '../server/mailbox';

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

/**
 * QT-02, BUG-001, TD-035: đi theo link trong mail. Server: link thật lấy từ hộp thư giả
 * (FAKE_MAIL_DIR); MSW: link với token giả `msw-reset-token`. Mọi bước sau khi mở link giống hệt.
 */
const NEW_PASSWORD = 'Moi@20261';
const RESET_INVALID = 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn';

async function requestResetLink(page: Page, base: string, email: string): Promise<string> {
  const since = Date.now();
  await page.goto(`${base}/forgot-password`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill(email);
  await page.getByRole('button', { name: 'Gửi liên kết đặt lại' }).click();
  await expect(page.getByText('Liên kết có hiệu lực trong 15 phút.')).toBeVisible();
  if (!onServer) return `${base}/reset-password?token=msw-reset-token`;
  return linkFrom(await lastMailTo(email, { since }), '/reset-password');
}

async function submitReset(page: Page, pwd: string, confirm = pwd) {
  await page.getByPlaceholder('Tối thiểu 8 ký tự').fill(pwd);
  await page.getByPlaceholder('Nhập lại mật khẩu').fill(confirm);
  await page.getByRole('button', { name: 'Cập nhật mật khẩu' }).click();
}

async function login(page: Page, email: string, pwd: string) {
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(pwd);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
}

test.describe('Đặt lại mật khẩu (QT-02)', () => {
  test('UAT-11 BUG-001 quên mật khẩu → mở link → đặt lại → đăng nhập bằng mật khẩu mới', async ({
    page,
  }) => {
    const email = 'an.nguyen@mediasoft.vn';
    const link = await requestResetLink(page, PORTAL_URL, email);
    expect(link.startsWith(`${PORTAL_URL}/reset-password?token=`)).toBe(true);
    await page.goto(link, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Đặt lại mật khẩu' })).toBeVisible();

    await submitReset(page, NEW_PASSWORD, 'Khac@2026');
    await expect(page.getByText('Mật khẩu nhập lại không khớp')).toBeVisible();
    // Mật khẩu yếu → báo tại ô Mật khẩu mới (server kiểm), link vẫn dùng được
    await submitReset(page, 'abc');
    await expect(
      page.getByText('Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ số và ký tự đặc biệt'),
    ).toBeVisible();

    await submitReset(page, NEW_PASSWORD);
    await expect(toast(page)).toHaveText('Đã đặt lại mật khẩu, vui lòng đăng nhập');
    await expect(page).toHaveURL(/\/login$/);
    await login(page, email, 'User@2026');
    await expect(page.locator('form').getByRole('alert')).toHaveText(
      'Email hoặc mật khẩu không đúng',
    );
    await login(page, email, NEW_PASSWORD);
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('BUG-001 link đã dùng → báo hết hạn + Gửi lại liên kết; thiếu token cũng vậy', async ({
    page,
  }) => {
    const link = await requestResetLink(page, PORTAL_URL, 'an.nguyen@mediasoft.vn');
    await page.goto(link, { waitUntil: 'networkidle' });
    await submitReset(page, NEW_PASSWORD);
    await expect(page).toHaveURL(/\/login$/);

    await page.goto(link, { waitUntil: 'networkidle' });
    await submitReset(page, 'Lan2@2026x');
    await expect(page.getByRole('alert').filter({ hasText: RESET_INVALID })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cập nhật mật khẩu' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Gửi lại liên kết' }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);

    await page.goto(`${PORTAL_URL}/reset-password`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('alert').filter({ hasText: RESET_INVALID })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gửi lại liên kết' })).toBeVisible();
  });

  test('BUG-001 D-62 TK quản trị → link Admin → đặt lại → đăng nhập Admin', async ({ page }) => {
    const email = 'admin@opchub.community';
    const link = await requestResetLink(page, ADMIN_URL, email);
    expect(link.startsWith(`${ADMIN_URL}/reset-password?token=`)).toBe(true);
    await page.goto(link, { waitUntil: 'networkidle' });
    await submitReset(page, NEW_PASSWORD);
    await expect(toast(page)).toHaveText('Đã đặt lại mật khẩu, vui lòng đăng nhập');
    await expect(page).toHaveURL(/\/login$/);
    await login(page, email, NEW_PASSWORD);
    await expect(page).toHaveURL(/\/overview$/);
  });
});

test.describe('Hướng dẫn sử dụng (mail chào mừng)', () => {
  test('BUG-023 /huong-dan hiển thị, không cần đăng nhập', async ({ page }) => {
    await page.goto(`${PORTAL_URL}/huong-dan`, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/huong-dan$/);
    await expect(page.getByRole('heading', { name: 'Hướng dẫn sử dụng OPC Hub' })).toBeVisible();
    for (const step of ['1. Đăng ký tài khoản', '3. Đóng phí thành viên', '5. Gia hạn']) {
      await expect(page.getByRole('heading', { name: step })).toBeVisible();
    }
    await expect(page.getByRole('heading', { name: 'Liên hệ hỗ trợ' })).toBeVisible();
  });
});
