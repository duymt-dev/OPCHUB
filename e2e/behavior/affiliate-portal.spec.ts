import { test, expect } from '../server/test';
import { PORTAL_URL } from '../urls';

test.use({ affiliateDemo: true });

test.describe('Affiliate — mã giới thiệu Portal (TIP-V2-403)', () => {
  test('REQ-303 /r ghi cookie chính sách, chuyển URL và tự điền sau khi chọn loại', async ({
    page,
  }) => {
    await page.goto(`${PORTAL_URL}/r/OPCAN26`);
    await expect(page).toHaveURL(/\/register\?ref=OPCAN26$/);
    await page.getByRole('button', { name: /^Cá nhân/ }).click();
    await expect(page).toHaveURL(/ref=OPCAN26/);
    await expect(page.getByPlaceholder('VD: OPCAN26')).toHaveValue('OPCAN26');
    await expect(
      page.getByText('✓ Được giới thiệu bởi Nguyễn Văn An', { exact: true }),
    ).toBeVisible();
    const cookie = (await page.context().cookies()).find((c) => c.name === 'opc_ref');
    expect(cookie).toBeDefined();
    expect(cookie?.value).toBe('OPCAN26');
    expect(cookie?.path).toBe('/');
    expect(cookie?.sameSite).toBe('Lax');
    expect(cookie?.httpOnly).toBe(false);
    expect(cookie?.expires).toBeGreaterThan(Date.now() / 1000 + 29 * 86400);
    expect(cookie?.expires).toBeLessThan(Date.now() / 1000 + 31 * 86400);
  });

  test('AT-AF03 REQ-304 mã của chính email bị chặn tại ô, submit không gửi đăng ký', async ({
    page,
  }) => {
    let registrations = 0;
    page.on('request', (r) => {
      if (r.method() === 'POST' && r.url().endsWith('/auth/register/personal')) registrations++;
    });
    await page.goto(`${PORTAL_URL}/register?type=per&ref=OPCAN26`);
    await page.getByPlaceholder('Nguyễn Văn An').fill('Nguyễn Văn An');
    await page.getByPlaceholder('ban@congty.vn').fill('an.nguyen@mediasoft.vn');
    await page.getByText(/^Tôi xác nhận là người đại diện hợp pháp/).click();
    const message = 'Không thể dùng mã giới thiệu của chính bạn';
    await expect(page.getByText(message, { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('VD: OPCAN26')).toHaveAttribute('aria-invalid', 'true');
    await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') }),
    ).toHaveText(message);
    expect(registrations).toBe(0);
    await expect(page.getByRole('dialog', { name: 'Xác thực email' })).toHaveCount(0);
  });

  test('REQ-303 URL ưu tiên cookie, đổi loại không mất mã; link sai định dạng về đăng ký', async ({
    page,
  }) => {
    await page.context().addCookies([{ name: 'opc_ref', value: 'OTHER123', url: PORTAL_URL }]);
    await page.goto(`${PORTAL_URL}/register?type=biz&ref=OPCAN26`);
    await expect(page.getByPlaceholder('VD: OPCAN26')).toHaveValue('OPCAN26');
    await page.getByRole('button', { name: 'Đổi loại' }).click();
    await page.getByRole('button', { name: /^Cá nhân/ }).click();
    await expect(page.getByPlaceholder('VD: OPCAN26')).toHaveValue('OPCAN26');
    await page.goto(`${PORTAL_URL}/r/BAD!CODE`);
    await expect(page).toHaveURL(`${PORTAL_URL}/register`);
  });

  test('REQ-303 mã nhập ở form đi qua SSO và được gửi khi hoàn tất, không OTP', async ({
    page,
  }) => {
    await page.goto(`${PORTAL_URL}/register?type=per`);
    await page.getByPlaceholder('VD: OPCAN26').fill('OPCAN26');
    await expect(
      page.getByText('✓ Được giới thiệu bởi Nguyễn Văn An', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: /Google/ }).click();
    await expect(page.getByText('Hoàn tất đăng ký', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /^Cá nhân/ }).click();
    await expect(page.getByPlaceholder('VD: OPCAN26')).toHaveValue('OPCAN26');
    await expect(
      page.getByText('✓ Được giới thiệu bởi Nguyễn Văn An', { exact: true }),
    ).toBeVisible();
    await page.getByText(/^Tôi xác nhận là người đại diện hợp pháp/).click();
    const sent = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().endsWith('/auth/sso/complete'),
    );
    await page.getByRole('button', { name: 'Hoàn tất và vào cộng đồng' }).click();
    const payload: unknown = (await sent).postDataJSON();
    if (payload === null || typeof payload !== 'object' || !('referralCode' in payload)) {
      throw new Error('SSO complete thiếu referralCode');
    }
    expect(payload.referralCode).toBe('OPCAN26');
    await expect(page).toHaveURL(/\/community$/);
    await expect(page.getByRole('dialog', { name: 'Xác thực email' })).toHaveCount(0);
  });
});
