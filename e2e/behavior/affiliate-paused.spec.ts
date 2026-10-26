import { test, expect } from '../server/test';
import { PORTAL_URL } from '../urls';

test.use({ affiliatePaused: true });

test('AT-AF05 REQ-304 mã hết hạn bị chặn tại form, không gửi đăng ký hoặc mở OTP', async ({
  page,
}) => {
  let sent = 0;
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().endsWith('/auth/register/personal')) sent++;
  });
  await page.goto(`${PORTAL_URL}/register?type=per&ref=HAOPC`);
  await page.getByPlaceholder('Nguyễn Văn An').fill('Người Được Giới Thiệu');
  const checked = page.waitForResponse(
    (r) => r.url().includes('/affiliate/codes/HAOPC?email=') && r.ok(),
  );
  await page.getByPlaceholder('ban@congty.vn').fill('paused-referral@test.vn');
  await page.getByRole('radio', { name: /Chuyên gia/ }).click();
  await page.getByText(/^Tôi xác nhận là người đại diện hợp pháp/).click();
  await checked;
  const error = 'Mã giới thiệu đang tạm dừng (đại lý hết hạn phí thành viên)';
  await expect(page.getByText(error, { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder('VD: OPCAN26')).toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  expect(sent).toBe(0);
  await expect(page.getByRole('dialog', { name: 'Xác thực email' })).toHaveCount(0);
});

test('AT-AF05 REQ-309 REQ-311 đại lý hết hạn vẫn xem lịch sử và sửa tài khoản nhận khoản cũ', async ({
  page,
}) => {
  await page.goto(`${PORTAL_URL}/login`);
  await page.locator('input[type=email]').fill('ha.le@opcmedia.vn');
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto(`${PORTAL_URL}/affiliate`);
  await expect(
    page.getByText('Mã đang tạm dừng — gia hạn phí để tiếp tục nhận hoa hồng', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('HAOPC', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sửa', exact: true }).click();
  await expect(page.getByLabel('Ngân hàng', { exact: true })).toHaveValue('ACB');
  await expect(page.getByRole('button', { name: 'Lưu tài khoản' })).toBeEnabled();
  await page.getByLabel('Ngân hàng', { exact: true }).selectOption('BIDV');
  await page.getByLabel('Số tài khoản', { exact: true }).fill('135792468');
  await page.getByRole('button', { name: 'Lưu tài khoản' }).click();
  await expect(page.getByText('BIDV · 135792468', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /Lịch sử nhận tiền/ }).click();
  await expect(page.getByText('Tổng đã nhận · 2 kỳ', { exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: /ACB/ })).toHaveCount(2);
});
