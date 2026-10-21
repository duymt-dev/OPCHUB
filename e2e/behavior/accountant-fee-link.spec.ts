import { feeRowSchema, myMembershipSchema } from '@opchub/shared/api-domains';
import { expect, test } from '../server/test';
import { newMember } from '../server/new-member-acceptance';
import { ADMIN_URL } from '../urls';

test('AT-LK02 UAT-10 REQ-402 LK-02 accountant collection updates the same new member and closes the open Portal fee gate for12months', async ({
  page,
  context,
}) => {
  const created = await newMember(page);
  const gate = page.getByRole('dialog', { name: 'Gói dịch vụ', exact: true });
  await expect(gate).toBeVisible();
  const admin = await context.newPage();
  await admin.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await admin.locator('input[type=email]').fill('mai.hoang@opchub.community');
  await admin.locator('input[type=password]').fill('Admin@2026');
  await admin.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(admin).toHaveURL(/\/overview$/);
  await admin.locator('aside').getByText('Phí thành viên', { exact: true }).click();
  await admin.getByPlaceholder('Tìm tên, email...').fill(created.email);
  const fee = admin.locator('[data-m="tbl"]').getByRole('row').filter({ hasText: created.email });
  await expect(fee).toHaveCount(1);
  await expect(fee).toContainText('Chờ thanh toán');
  const collected = admin.waitForResponse(
    (r) =>
      new URL(r.url()).pathname ===
      `/v1/admin/fees/${encodeURIComponent(created.session.me.id)}/collect`,
  );
  const requestedAt = Date.now();
  await fee.getByRole('button', { name: 'Ghi nhận đã thu', exact: true }).click();
  const response = await collected;
  expect(response.status()).toBe(200);
  const paid = feeRowSchema.parse(await response.json());
  expect(paid).toMatchObject({
    userId: created.session.me.id,
    email: created.email,
    fullName: created.name,
    amount: 600000,
    status: 'active',
  });
  expect(paid.paidAt).not.toBeNull();
  expect(paid.validUntil).not.toBeNull();
  const paidAt = Date.parse(paid.paidAt ?? '');
  expect(paidAt).toBeGreaterThanOrEqual(requestedAt);
  expect(paidAt).toBeLessThanOrEqual(Date.now());
  const twelveMonths = new Date(paidAt);
  twelveMonths.setUTCMonth(twelveMonths.getUTCMonth() + 12);
  expect(paid.validUntil).toBe(twelveMonths.toISOString());
  await expect(fee.getByText('Đang hiệu lực', { exact: true })).toBeVisible();
  // The already-open Portal must react; no reload or manual refresh before this.
  await expect(gate).toHaveCount(0, { timeout: 20000 });
  const membershipLoaded = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/me/membership',
  );
  await page.reload();
  const current = myMembershipSchema.parse(await (await membershipLoaded).json());
  expect(current).toMatchObject({
    status: 'active',
    validUntil: paid.validUntil,
    transferRef: created.session.me.membershipFee?.transferRef,
  });
  await expect(gate).toHaveCount(0);
  await page.locator('aside').getByRole('link', { name: 'Cộng đồng', exact: true }).click();
  await expect(page.getByText('Khám phá cộng đồng', { exact: true })).toBeVisible();
  await expect(gate).toHaveCount(0);
});
