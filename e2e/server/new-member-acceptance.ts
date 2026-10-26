import { randomUUID, randomInt } from 'node:crypto';
import { loginResponseSchema } from '@opchub/shared/api';
import { expect, type Page } from './test';
import { PORTAL_URL } from '../urls';
import { completeDeclaration } from '../behavior/helpers/declaration';
export const password = 'User@2026';
const popup = (page: Page) => page.getByRole('dialog', { name: 'Gói dịch vụ', exact: true });

export async function newMember(page: Page) {
  const id = randomUUID();
  const email = `p5-paywall-${id}@example.test`;
  const name = `P5 Moi ${id.slice(0, 8)}`;
  const phone = `09${randomInt(10000000, 100000000)}`;
  await page.goto(`${PORTAL_URL}/register?type=per`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('Nguyễn Văn An').fill(name);
  await page.getByPlaceholder('912 345 678').fill(phone);
  await page.getByPlaceholder('ban@congty.vn').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('radio', { name: /Chuyên gia/ }).click();
  await page.getByText(/^Tôi xác nhận là người đại diện hợp pháp/).click();
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
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
    status: 'active',
    membershipFee: { status: 'pending_payment' },
  });
  await expect(page).toHaveURL(/\/community$/);
  // Native P-05 shows the newly sent welcome before the mandatory fee gate.
  // Close the real preview explicitly rather than racing its asynchronous load.
  const welcome = page.getByRole('dialog', { name: 'Đã gửi email chào mừng', exact: true });
  await expect(welcome).toContainText(email);
  await welcome.getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(welcome).toHaveCount(0);
  // V4-607 (prototype v4): đóng mail chào mừng → popup khai báo (điền sẵn) → Bảng giá
  await completeDeclaration(page);
  await expect(popup(page)).toBeVisible();
  return { email, name, phone, session };
}
