import { feeRowSchema, myMembershipSchema } from '@opchub/shared/api-domains';
import { pageSchema } from '@opchub/shared/api';
import { expect, test } from '../server/test';
import { newMember } from '../server/new-member-acceptance';
import { ADMIN_URL } from '../urls';

test('AT-LK02 UAT-10 REQ-402 LK-02 D-94 accountant collection turns the new trial member active for 12 months and the open Portal updates live', async ({
  page,
  context,
}) => {
  const created = await newMember(page);
  // TK mới đang miễn phí 3 tháng: Admin thu tay thì Portal đang mở tự cập nhật (không reload)
  const badge = page.getByRole('region', { name: 'Gói thành viên' });
  await expect(badge).toContainText('Đang hoạt động');
  const before = await badge.innerText();
  const admin = await context.newPage();
  await admin.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await admin
    .locator('input[autocomplete=username], input[type=email]')
    .fill('mai.hoang@opchub.community');
  await admin.locator('input[type=password]').fill('Admin@2026');
  await admin.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(admin).toHaveURL(/\/overview$/);
  await admin.locator('aside').getByText('Phí thành viên', { exact: true }).click();
  await admin.getByPlaceholder('Tìm tên, email...').fill(created.email);
  const fee = admin.locator('[data-m="tbl"]').getByRole('row').filter({ hasText: created.email });
  await expect(fee).toHaveCount(1);
  await expect(fee).toContainText('Miễn phí 3 tháng');
  // Prototype v4.2 (TIP-V42-708): dòng trial chỉ có "Gửi nhắc"; kế toán thu tay qua thanh chọn hàng loạt
  await expect(fee.getByRole('button', { name: 'Ghi nhận đã thu', exact: true })).toHaveCount(0);
  await fee.getByRole('checkbox').click();
  const bar = admin.getByRole('region', { name: 'Thao tác hàng loạt' });
  const collected = admin.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/admin/fees/collect',
  );
  // Arm before clicking: collection can invalidate/refetch before click resolves.
  const reloaded = admin.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/admin/fees' && r.request().method() === 'GET',
  );
  const requestedAt = Date.now();
  await bar.getByRole('button', { name: 'Ghi nhận đã thu', exact: true }).click();
  const response = await collected;
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ updated: 1 });
  const page1 = pageSchema(feeRowSchema).parse(await (await reloaded).json());
  const paid = page1.items.find((x) => x.userId === created.session.me.id);
  if (!paid) throw new Error('không thấy dòng phí sau khi thu');
  expect(paid).toMatchObject({
    userId: created.session.me.id,
    email: created.email,
    fullName: created.name,
    amount: 1200000,
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
  await expect(badge).not.toHaveText(before, { timeout: 20000 });
  await expect(badge).toContainText('Đang hoạt động');
  const gate = page.getByRole('dialog', { name: 'Gói dịch vụ', exact: true });
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
