import { expect, test } from '@playwright/test';
import { myMembershipSchema } from '@opchub/shared/api-domains';
import { ADMIN, ADMIN_URL, PORTAL_URL, UNPAID, login, resetDemo } from './lib';

/** Native acceptance: manual collection must release the already-open paid gate. */
test('AT-LK01 AT-LK02 manual collection closes the live paywall and persists twelve months', async ({
  page,
  context,
}) => {
  resetDemo();
  await login(page, PORTAL_URL, UNPAID);
  const gate = page.getByRole('dialog', { name: 'Gói dịch vụ' });
  await expect(gate).toBeVisible();
  await expect(gate.getByRole('button', { name: 'Đóng', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(gate).toBeVisible();
  await page.locator('aside').getByText('Cộng đồng', { exact: true }).dispatchEvent('click');
  await expect(gate).toBeVisible();

  const admin = await context.newPage();
  await login(admin, ADMIN_URL, ADMIN);
  await admin.locator('aside').getByText('Phí thành viên', { exact: true }).click();
  const row = admin.getByRole('row').filter({ hasText: 'Đỗ Hải Yến' });
  await expect(row.getByText('Chờ thanh toán', { exact: true })).toBeVisible();
  const started = Date.now();
  const collected = admin.waitForResponse(
    (r) => r.request().method() === 'POST' && /\/admin\/fees\/[^/]+\/collect$/.test(r.url()),
  );
  await row.getByRole('button', { name: 'Ghi nhận đã thu', exact: true }).click();
  expect((await collected).status()).toBe(200);
  await expect(row.getByText('Đang hiệu lực', { exact: true })).toBeVisible();
  // No reload or navigation: the existing Portal must react to the real worker/socket event.
  await expect(gate).toHaveCount(0, { timeout: 20_000 });
  const membership = page.waitForResponse((r) => r.url().endsWith('/me/membership') && r.ok());
  await page.reload();
  const saved = myMembershipSchema.parse(await (await membership).json());
  expect(saved.status).toBe('active');
  expect(saved.validUntil).not.toBeNull();
  const until = Date.parse(saved.validUntil ?? '');
  const lower = new Date(started);
  lower.setUTCFullYear(lower.getUTCFullYear() + 1);
  const upper = new Date();
  upper.setUTCFullYear(upper.getUTCFullYear() + 1);
  expect(until).toBeGreaterThanOrEqual(lower.getTime() - 1_000);
  expect(until).toBeLessThanOrEqual(upper.getTime() + 1_000);
  await expect(gate).toHaveCount(0);
  await admin.close();
});
