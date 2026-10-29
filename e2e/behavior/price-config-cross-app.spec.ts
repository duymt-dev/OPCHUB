import { adminPriceConfigSchema, priceConfigSchema } from '@opchub/shared';
import { auditLogRowSchema } from '@opchub/shared/api-domains';
import { z } from 'zod';
import { expect, test, type Page } from '../server/test';
import { newMember, openPricing } from '../server/new-member-acceptance';
import { ADMIN_URL, PORTAL_URL } from '../urls';

async function login(page: Page, origin: string, email: string, password: string) {
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[autocomplete=username], input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

test('E2E-12 REQ-603 saved Admin prices reach Portal payment and survive both reloads', async ({
  page,
  context,
}) => {
  await login(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
  await page.goto(`${ADMIN_URL}/settings?tab=price`, { waitUntil: 'networkidle' });
  const personal = page.locator('[data-plan]').filter({ hasText: 'Gói Cá nhân' }).first();
  await personal.getByLabel('Giá bán / năm (đ)').fill('1560000');
  const saving = page.waitForResponse(
    (response) =>
      response.url().endsWith('/admin/price-config') && response.request().method() === 'PUT',
  );
  await page.getByRole('button', { name: 'Lưu bảng giá' }).click();
  const response = await saving;
  expect(response.status()).toBe(200);
  const saved = adminPriceConfigSchema.parse(await response.json());
  expect(saved.per.y).toBe(1_560_000);

  const portal = await context.newPage();
  const pricing = portal.waitForResponse((r) => r.url().endsWith('/public/price-config'));
  // §27.2: new prices apply to new transactions, not an existing seed fee snapshot.
  const member = await newMember(portal);
  const plans = await openPricing(portal);
  expect(priceConfigSchema.parse(await (await pricing).json()).per.y).toBe(saved.per.y);
  await expect(plans.locator('[data-plan="personal"]')).toContainText('130.000đ/tháng');
  await plans.getByRole('button', { name: 'Gia hạn · 1.560.000đ/năm', exact: true }).click();
  const payment = portal.getByRole('dialog', { name: /^Thanh toán Gói / });
  await expect(payment).toContainText('1.560.000đ');
  const transferRef = member.session.me.membershipFee?.transferRef;
  expect(transferRef).toMatch(/^OPCHUB TV\d{6}$/);
  await expect(payment).toContainText(`${transferRef} ${member.phone}`);

  await portal.goto(`${PORTAL_URL}/community`);
  await portal.reload();
  await openPricing(portal);
  await expect(plans.locator('[data-plan="personal"]')).toContainText('130.000đ/tháng');
  const reloading = page.waitForResponse((r) => r.url().endsWith('/admin/price-config'));
  await page.reload();
  expect(adminPriceConfigSchema.parse(await (await reloading).json())).toEqual(saved);
  await expect(personal.getByLabel('Giá bán / năm (đ)')).toHaveValue('1560000');
  const auditing = page.waitForResponse((r) => r.url().endsWith('/admin/audit-logs'));
  await page
    .getByRole('navigation', { name: 'Mục cài đặt' })
    .getByRole('button')
    .filter({ hasText: 'Nhật ký hoạt động' })
    .click();
  const audit = z
    .object({ items: z.array(auditLogRowSchema) })
    .parse(await (await auditing).json());
  const changes = audit.items.filter((row) => row.tag === 'pricing' && row.at >= saved.updatedAt);
  expect(changes).toHaveLength(1);
  expect(changes[0]?.summary).toBe('Cập nhật bảng giá');
  await expect(
    page
      .getByRole('list', { name: 'Nhật ký hoạt động quản trị' })
      .getByRole('listitem')
      .filter({ hasText: 'Cập nhật bảng giá' })
      .first(),
  ).toBeVisible();
});
