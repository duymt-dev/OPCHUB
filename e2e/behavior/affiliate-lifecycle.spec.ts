import { test, expect, type Page } from '../server/test';
import { onServer, payFee } from '../server/api';
import { PORTAL_URL } from '../urls';

test.use({ affiliateDemo: true });

async function registerReferral(page: Page) {
  const email = `affiliate-${Date.now()}@test.vn`;
  await page.goto(`${PORTAL_URL}/r/HAOPC`);
  await expect(page).toHaveURL(/\/register\?ref=HAOPC$/);
  await page.getByRole('button', { name: /^Cá nhân/ }).click();
  await expect(page.getByPlaceholder('VD: OPCAN26')).toHaveValue('HAOPC');
  await expect(page.getByText('✓ Được giới thiệu bởi Lê Thu Hà', { exact: true })).toBeVisible();
  await page.getByPlaceholder('Nguyễn Văn An').fill('Nguyễn Affiliate Trà My');
  const checked = page.waitForResponse(
    (r) => r.url().includes('/affiliate/codes/HAOPC?email=') && r.ok(),
  );
  await page.getByPlaceholder('ban@congty.vn').fill(email);
  await page.getByRole('radio', { name: /Chuyên gia/ }).click();
  await page.getByText(/không hoàn lại sau khi thanh toán/).click();
  await checked;
  await expect(page.getByText('✓ Được giới thiệu bởi Lê Thu Hà', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Xác thực email' })).toBeVisible();
  await page.getByLabel('Mã OTP').fill('123456');
  await page.getByRole('button', { name: 'Xác nhận & kích hoạt tài khoản' }).click();
  await expect(page).toHaveURL(/\/community$/);
  const welcome = page.getByRole('dialog', { name: 'Đã gửi email chào mừng' });
  await expect(welcome).toBeVisible({ timeout: 20_000 });
  await welcome.getByRole('button', { name: 'Đóng', exact: true }).click();
}

async function payAndOpenAffiliate(page: Page) {
  await page.getByRole('button', { name: /Đăng ký thành viên ngay/ }).click();
  await expect(page).toHaveURL(/\/membership\/pay$/);
  await page.getByRole('button', { name: 'Tôi đã chuyển khoản', exact: true }).click();
  // Same bank-event precondition: MSW schedules its fake webhook; native uses FakeBank.
  if (onServer) await payFee(page, { reload: false });
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
  await page.getByRole('link', { name: 'Affiliate', exact: true }).click();
  await expect(
    page.getByRole('heading', {
      name: 'Giới thiệu thành viên mới, nhận 20% hoa hồng',
    }),
  ).toBeVisible({ timeout: 20_000 });
}

async function ownerSignIn(page: Page) {
  await page.locator('button[data-m="me"]').click();
  const loggedOut = page.waitForResponse((r) => r.url().endsWith('/auth/logout') && r.ok());
  await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();
  await loggedOut;
  await expect(page).toHaveURL(/\/login$/);
  await page.locator('input[type=email]').fill('ha.le@opcmedia.vn');
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('dialog', { name: 'Đã gửi email chào mừng' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Affiliate', exact: true }).click();
}

test('AT-AF02 BUG-045 REQ-303 REQ-309 đăng ký HAOPC, đóng phí, khai STK đầu tiên, chủ mã thấy hoa hồng', async ({
  page,
}) => {
  await registerReferral(page);
  await payAndOpenAffiliate(page);
  await expect(
    page.getByText('Chưa có số tài khoản nhận hoa hồng.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cập nhật ngay', exact: true }).click();
  await page.getByLabel('Ngân hàng', { exact: true }).selectOption('ACB');
  await page.getByLabel('Số tài khoản', { exact: true }).fill('135792468');
  await page.getByLabel('Tên chủ tài khoản', { exact: true }).fill('nguyễn affiliate trà my');
  await expect(page.getByLabel('Tên chủ tài khoản', { exact: true })).toHaveValue(
    'NGUYEN AFFILIATE TRA MY',
  );
  await page.getByRole('button', { name: 'Lưu tài khoản' }).click();
  await expect(page.getByText('ACB · 135792468', { exact: true })).toBeVisible();
  await expect(page.getByText('Chưa có số tài khoản nhận hoa hồng.', { exact: true })).toHaveCount(
    0,
  );
  await ownerSignIn(page);
  await expect(page.getByText('HAOPC', { exact: true })).toBeVisible();
  const row = page.getByRole('row').filter({ hasText: 'Nguyễn Affiliate Trà M.' });
  await expect(row).toBeVisible({ timeout: 20_000 });
  await expect(row.getByRole('cell', { name: '600.000đ', exact: true })).toBeVisible();
  await expect(row.getByRole('cell', { name: '150.000đ', exact: true })).toBeVisible();
  await expect(row.getByText('Đã ghi nhận', { exact: true })).toBeVisible();
});
