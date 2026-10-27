import { loginResponseSchema } from '@opchub/shared/api';
import { expect, test, type Page } from '../server/test';

import { newMember, password } from '../server/new-member-acceptance';
const popup = (page: Page) => page.getByRole('dialog', { name: 'Gói dịch vụ', exact: true });
const notice = (page: Page) => page.getByRole('status').filter({ visible: true });

test('UAT-06 UAT-07 UAT-08 AT-LK01 REQ-409 new unpaid account cannot dismiss fee popup and gets its own transfer reference', async ({
  page,
}) => {
  const created = await newMember(page);
  const p = popup(page);
  await expect(p.getByText('Cần thanh toán để tiếp tục', { exact: true })).toBeVisible();
  await expect(p.getByRole('button', { name: 'Đóng' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(notice(page)).toHaveText(
    'Vui lòng thanh toán phí thành viên để tiếp tục sử dụng OPC Hub',
  );
  await expect(p).toBeVisible();
  await page.mouse.click(2, 2);
  await expect(notice(page)).toHaveText(
    'Vui lòng thanh toán phí thành viên để tiếp tục sử dụng OPC Hub',
  );
  await expect(p).toBeVisible();
  await page
    .locator('aside')
    .getByRole('link', { name: 'Dự án OPC', exact: true })
    .dispatchEvent('click');
  await expect(p).toBeVisible();
  expect(created.session.me.membershipFee?.transferRef).toMatch(/^OPCHUB TV\d{6}$/);
  await p.getByRole('button', { name: /^Đăng ký · / }).click();
  const pay = page.getByRole('dialog', { name: /^Thanh toán Gói / });
  await expect(pay).toBeVisible();
  await expect(pay).toContainText(
    `${created.session.me.membershipFee?.transferRef} ${created.phone}`,
  );
  await expect(pay).toContainText('Gói Cá nhân · 1.200.000đ / năm');
  await expect(pay).toContainText('không hoàn lại');
});

test('UAT-30 AT-LK01 REQ-401 fresh registered member logs out and logs back into the same unpaid account', async ({
  page,
}) => {
  const created = await newMember(page);
  await popup(page).getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await page.locator('input[autocomplete=username], input[type=email]').fill(created.email);
  await page.locator('input[type=password]').fill(password);
  const requested = page.waitForResponse((r) => new URL(r.url()).pathname === '/v1/auth/login');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const response = await requested;
  expect(response.status()).toBe(200);
  const session = loginResponseSchema.parse(await response.json());
  expect(session.me).toMatchObject({
    id: created.session.me.id,
    email: created.email,
    fullName: created.name,
    status: 'active',
    membershipFee: { status: 'pending_payment' },
  });
  await expect(popup(page)).toBeVisible();
  await expect(popup(page).getByRole('button', { name: 'Đóng' })).toHaveCount(0);
});
