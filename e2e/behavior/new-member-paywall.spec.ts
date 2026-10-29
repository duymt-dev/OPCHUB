import { loginResponseSchema } from '@opchub/shared/api';
import { expect, test, type Page } from '../server/test';

import { newMember, openPricing, password } from '../server/new-member-acceptance';
const popup = (page: Page) => page.getByRole('dialog', { name: 'Gói dịch vụ', exact: true });

test('UAT-06 UAT-07 UAT-08 AT-LK01 REQ-601 D-94 new account is on the 3-month trial: no mandatory popup, voluntary pricing has its own transfer reference', async ({
  page,
}) => {
  const created = await newMember(page);
  // BR-TRIAL-02: đang miễn phí = đã kích hoạt, đi được mọi mục
  await page.locator('aside').getByRole('link', { name: 'Dự án OPC', exact: true }).click();
  await expect(page).toHaveURL(/\/projects/);
  await expect(popup(page)).toHaveCount(0);
  // Chân sidebar (prototype `sbFoot`): trial còn hạn = đang hoạt động
  await expect(page.getByRole('region', { name: 'Gói thành viên' })).toContainText(
    'Đang hoạt động',
  );
  expect(created.session.me.membershipFee?.transferRef).toMatch(/^OPCHUB TV\d{6}$/);
  // Mở Bảng giá tự nguyện: đóng được
  const p = await openPricing(page);
  await p.getByRole('button', { name: 'Đóng' }).click();
  await expect(p).toHaveCount(0);
  // Nâng cấp sớm: hộp chuyển khoản dùng nội dung CK của chính TK
  const again = await openPricing(page);
  await again.getByRole('button', { name: /^(Đăng ký|Gia hạn) · .*\/năm$/ }).click();
  const pay = page.getByRole('dialog', { name: /^Thanh toán Gói / });
  await expect(pay).toBeVisible();
  await expect(pay).toContainText(
    `${created.session.me.membershipFee?.transferRef} ${created.phone}`,
  );
  await expect(pay).toContainText('Gói Cá nhân · 1.200.000đ / năm');
  await expect(pay).toContainText('không hoàn lại');
});

test('UAT-30 AT-LK01 REQ-401 fresh registered member logs out and logs back into the same trial account', async ({
  page,
}) => {
  const created = await newMember(page);
  await page.locator('button[data-m="me"]').click();
  await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();
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
    membershipFee: { status: 'trial' },
  });
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  await expect(popup(page)).toHaveCount(0);
});
