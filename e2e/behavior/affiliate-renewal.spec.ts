import { z } from 'zod';
import { test, expect } from '../server/test';
import { onServer, payFee } from '../server/api';
import { ADMIN_URL, PORTAL_URL } from '../urls';
import { registerReferral, payAndOpenAffiliate } from './helpers/affiliate-registration';
import { signInAffiliate } from './helpers/affiliate-session';

test.use({ affiliateDemo: true });

const membership = z.object({ status: z.string(), validUntil: z.string().datetime() });

test('AT-AF04 D-131 another paid receipt within customer year one keeps the first-year reference rate', async ({
  page,
  context,
}) => {
  await registerReferral(page);
  await payAndOpenAffiliate(page);
  const admin = await context.newPage();
  await signInAffiliate(admin, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
  await admin.getByRole('tab', { name: /^Hoa hồng/ }).click();
  await admin.getByPlaceholder('Tìm thành viên hoặc affiliate...').fill('Nguyễn Affiliate Trà My');
  const commission = admin.getByRole('row').filter({ hasText: 'Nguyễn Affiliate Trà My' });
  await expect(commission).toHaveCount(1);
  // D-70: 25% × Gói Cá nhân 1.200.000
  await expect(commission).toContainText('300.000đ');
  await expect(commission).toContainText('Đã ghi nhận');

  const current = page.waitForResponse((r) => r.url().endsWith('/me/membership') && r.ok());
  await page.goto(`${PORTAL_URL}/membership/pay`);
  const before = membership.parse(await (await current).json());
  await page.getByRole('button', { name: 'Tôi đã chuyển khoản', exact: true }).click();
  // Only the bank-event source differs; customer year follows receipt time, not prepaid expiry.
  if (onServer) await payFee(page, { reload: false });
  // Native pushes the new expiry into cache via socket; only MSW polls this endpoint.
  // Require reactive completion in both modes, then verify the persisted expiry after F5.
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
  const renewed = page.waitForResponse((r) => r.url().endsWith('/me/membership') && r.ok());
  await page.reload();
  const after = membership.parse(await (await renewed).json());
  expect(after.status).toBe('active');
  expect(Date.parse(after.validUntil)).toBeGreaterThan(Date.parse(before.validUntil));
  expect(new Date(after.validUntil).getUTCFullYear()).toBe(
    new Date(before.validUntil).getUTCFullYear() + 1,
  );
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
  await admin.reload();
  await expect(commission).toHaveCount(2);
  for (const row of await commission.all()) {
    await expect(row).toContainText('300.000đ');
    await expect(row).toContainText('25% · Năm 1');
    await expect(row).toContainText('Đã ghi nhận');
  }
  // Portal renewal-history presentation belongs to TIP-804; do not assert the retired one-row rule.
});
