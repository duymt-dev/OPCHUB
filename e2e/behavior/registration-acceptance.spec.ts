import { randomUUID } from 'node:crypto';
import { loginResponseSchema } from '@opchub/shared/api';
import { expect, test, type Page } from '../server/test';
import { ADMIN_URL, PORTAL_URL } from '../urls';

async function registerPersonal(page: Page) {
  const id = randomUUID();
  const email = `p5-registration-${id}@example.test`;
  const name = `P5 Nghiem thu ${id.slice(0, 8)}`;
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Đăng ký', exact: true }).click();
  await page.getByRole('button', { name: /^Cá nhân/ }).click();
  await page.getByPlaceholder('Nguyễn Văn An').fill(name);
  await page.getByPlaceholder('ban@congty.vn').fill(email);
  await page.getByText(/^Tôi xác nhận là người đại diện hợp pháp/).click();
  const requested = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/auth/register/personal',
  );
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  expect((await requested).status()).toBe(202);
  const dialog = page.getByRole('dialog', { name: 'Xác thực email', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(email);
  return { email, name, dialog };
}

async function loginAdmin(page: Page) {
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
}

async function sentMail(admin: Page, email: string, kind: 'Mã OTP' | 'Chào mừng') {
  // D-73: Marketing gỡ khỏi sidebar, vào bằng đường dẫn (nhật ký gửi email)
  await admin.goto(`${ADMIN_URL}/marketing`);
  await admin.getByRole('tab', { name: 'Nhật ký gửi', exact: true }).click();
  await expect(admin).toHaveURL(/tab=log/);
  const item = admin
    .getByRole('list', { name: 'Nhật ký gửi email' })
    .getByRole('listitem')
    .filter({ hasText: email })
    .filter({ has: admin.getByText(kind, { exact: true }) });
  // reload resolves before the client query has rendered; wait for the exact
  // recipient/status rather than sampling a pre-hydration count on every retry.
  await expect(async () => {
    await admin.reload();
    await expect(item).toHaveCount(1);
    await expect(item.getByText('✓ Đã gửi', { exact: true })).toHaveCount(1);
  }).toPass({ timeout: 20000, intervals: [1000, 2000, 3000] });
  await expect(item).toHaveCount(1);
  await expect(item).toContainText(email);
}

test('UAT-02 UAT-03 personal registration sends its own OTP email and short OTP is blocked before verification', async ({
  page,
  context,
}) => {
  const created = await registerPersonal(page);
  let verificationRequests = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/v1/auth/otp/verify') verificationRequests += 1;
  });
  await created.dialog.getByLabel('Mã OTP').fill('123');
  await created.dialog.getByRole('button', { name: 'Xác nhận & kích hoạt tài khoản' }).click();
  await expect(created.dialog.getByRole('alert')).toHaveText('Vui lòng nhập đủ 6 chữ số');
  expect(verificationRequests).toBe(0);
  const admin = await context.newPage();
  await loginAdmin(admin);
  await sentMail(admin, created.email, 'Mã OTP');
});

test('UAT-04 REQ-401 LK-01 personal OTP activation creates the same active unpaid member in Admin and logs welcome delivery', async ({
  page,
  context,
}) => {
  const created = await registerPersonal(page);
  const accepted = page.waitForResponse((r) => new URL(r.url()).pathname === '/v1/auth/otp/verify');
  await created.dialog.getByLabel('Mã OTP').fill('123456');
  await created.dialog.getByRole('button', { name: 'Xác nhận & kích hoạt tài khoản' }).click();
  const response = await accepted;
  expect(response.ok()).toBe(true);
  const session = loginResponseSchema.parse(await response.json());
  expect(session.me).toMatchObject({
    email: created.email,
    fullName: created.name,
    status: 'active',
    accountType: 'personal',
    membershipFee: { status: 'pending_payment' },
    // V4-607: TK mới chưa khai báo → popup khai báo trước Bảng giá
    needsDeclaration: true,
  });
  await expect(page).toHaveURL(/\/community$/);
  const admin = await context.newPage();
  await loginAdmin(admin);
  await admin.goto(`${ADMIN_URL}/members?view=list`, { waitUntil: 'networkidle' });
  await admin.getByPlaceholder('Tìm theo tên, email...').fill(created.email);
  const row = admin.locator('[data-m="tbl"] > div > div').filter({ hasText: created.email });
  await expect(row).toHaveCount(1);
  await expect(row.getByText('Hoạt động', { exact: true })).toBeVisible();
  await row.getByRole('button', { name: new RegExp(`^${created.name}`) }).click();
  const profile = admin.getByRole('dialog', { name: 'Hồ sơ đăng ký', exact: true });
  await expect(profile).toContainText(created.name);
  await expect(profile).toContainText(created.email);
  await admin.keyboard.press('Escape');
  await expect(profile).toHaveCount(0);
  await sentMail(admin, created.email, 'Chào mừng');
});
