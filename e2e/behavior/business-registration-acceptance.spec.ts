import { randomUUID } from 'node:crypto';
import { loginResponseSchema, registerBusinessSchema } from '@opchub/shared/api';
import { adminMemberPageSchema } from '@opchub/shared/api-domains';
import { expect, test } from '../server/test';
import { ADMIN_URL, PORTAL_URL } from '../urls';

test('UAT-05 REQ-401 LK-01 business tax autofill and OTP create the same active unpaid business profile and Admin fee', async ({
  page,
  context,
}) => {
  const id = randomUUID();
  const email = `p5-business-${id}@example.test`;
  const name = `P5 Dai dien ${id.slice(0, 8)}`;
  const company = 'Công ty TNHH Giải pháp MediaSoft';
  await page.goto(`${PORTAL_URL}/register?type=biz`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('VD: 0101234567').fill('0101234567');
  await expect(page.getByText(/Đã tìm thấy doanh nghiệp/)).toBeVisible();
  await expect(page.getByPlaceholder('Công ty TNHH ...')).toHaveValue(company);
  const industry = await page.getByLabel('Ngành nghề kinh doanh chính').inputValue();
  expect(industry.length).toBeGreaterThan(0);
  await expect(page.getByText('Ngành nghề đăng ký khác (4)')).toBeVisible();
  await page.getByRole('button', { name: /^Bỏ ngành 6202/ }).click();
  await expect(page.getByText('Ngành nghề đăng ký khác (3)')).toBeVisible();
  await page.getByLabel('Họ và tên *').fill(name);
  await page.getByPlaceholder('lienhe@congty.vn').fill(email);
  await page.getByRole('button', { name: /OPC Hà Nội/ }).click();
  await page.getByText(/^Tôi xác nhận là người đại diện hợp pháp/).click();
  const requested = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/auth/register/business',
  );
  await page.getByRole('button', { name: 'Đăng ký doanh nghiệp', exact: true }).click();
  const registration = await requested;
  expect(registration.status()).toBe(202);
  const submitted = registerBusinessSchema.parse(registration.request().postDataJSON());
  expect(submitted).toMatchObject({
    companyName: company,
    taxCode: '0101234567',
    representative: name,
    email,
    mainIndustry: industry,
  });
  expect(submitted.otherIndustries).toHaveLength(3);
  expect(submitted.otherIndustries).not.toContain('6202');
  const otp = page.getByRole('dialog', { name: 'Xác thực email', exact: true });
  await expect(otp).toContainText(email);
  const accepted = page.waitForResponse((r) => new URL(r.url()).pathname === '/v1/auth/otp/verify');
  await otp.getByLabel('Mã OTP').fill('123456');
  await otp.getByRole('button', { name: 'Xác nhận & kích hoạt tài khoản' }).click();
  const response = await accepted;
  expect(response.status()).toBe(200);
  const session = loginResponseSchema.parse(await response.json());
  expect(session.me).toMatchObject({
    email,
    fullName: name,
    accountType: 'business',
    status: 'active',
    membershipFee: { status: 'pending_payment' },
    // V4-607: TK mới chưa khai báo → popup khai báo trước Bảng giá
    needsDeclaration: true,
  });
  await expect(page).toHaveURL(/\/community$/);

  const admin = await context.newPage();
  await admin.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await admin.locator('input[type=email]').fill('admin@opchub.community');
  await admin.locator('input[type=password]').fill('Admin@2026');
  await admin.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(admin).not.toHaveURL(/\/login(?:\?|$)/);
  await admin.locator('aside').getByText('Thành viên', { exact: true }).click();
  await admin.getByRole('radio', { name: /Doanh nghiệp/ }).click();
  const loaded = admin.waitForResponse((r) => {
    const url = new URL(r.url());
    return url.pathname === '/v1/admin/users' && url.searchParams.get('q') === email;
  });
  await admin.getByPlaceholder('Tìm theo tên, email...').fill(email);
  const members = adminMemberPageSchema.parse(await (await loaded).json());
  expect(members.items).toHaveLength(1);
  expect(members.items[0]).toMatchObject({
    id: session.me.id,
    email,
    fullName: name,
    accountType: 'business',
    status: 'active',
    organization: company,
    business: {
      taxCode: '0101234567',
      companyName: company,
      field: industry,
      verification: 'verified',
    },
  });
  const row = admin.locator('[data-m="tbl"] > div > div').filter({ hasText: email });
  await expect(row).toHaveCount(1);
  await expect(row.getByText('Hoạt động', { exact: true })).toBeVisible();
  await row.getByRole('button', { name: new RegExp(`^${name}`) }).click();
  const profile = admin.getByRole('dialog', { name: 'Hồ sơ đăng ký', exact: true });
  for (const value of [name, email, company, '0101234567', industry])
    await expect(profile).toContainText(value);
  await admin.keyboard.press('Escape');
  await expect(profile).toHaveCount(0);
  await admin.locator('aside').getByText('Phí thành viên', { exact: true }).click();
  await admin.getByPlaceholder('Tìm tên, email...').fill(email);
  const fee = admin.locator('[data-m="tbl"]').getByRole('row').filter({ hasText: email });
  await expect(fee).toHaveCount(1);
  await expect(fee).toContainText(name);
  await expect(fee).toContainText('Chờ thanh toán');
  await expect(fee.getByRole('button', { name: 'Ghi nhận đã thu' })).toBeVisible();
  // D-73: Marketing gỡ khỏi sidebar, vào bằng đường dẫn (nhật ký gửi email)
  await admin.goto(`${ADMIN_URL}/marketing`);
  await admin.getByRole('tab', { name: 'Nhật ký gửi', exact: true }).click();
  for (const kind of ['Mã OTP', 'Chào mừng']) {
    const mail = admin
      .getByRole('list', { name: 'Nhật ký gửi email' })
      .getByRole('listitem')
      .filter({ hasText: email })
      .filter({ has: admin.getByText(kind, { exact: true }) });
    await expect(async () => {
      await admin.reload();
      await expect(mail).toHaveCount(1);
      await expect(mail.getByText('✓ Đã gửi', { exact: true })).toHaveCount(1);
    }).toPass({ timeout: 20000, intervals: [1000, 2000, 3000] });
  }
});
