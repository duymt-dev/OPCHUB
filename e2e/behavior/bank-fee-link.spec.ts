import { pageSchema } from '@opchub/shared/api';
import { feeRowSchema, myMembershipSchema } from '@opchub/shared/api-domains';
import { expect, test } from '../server/test';
import { newMember } from '../server/new-member-acceptance';
import { onServer, simulateTransfer } from '../server/api';
import { ADMIN_URL } from '../urls';

test('UAT-09 AT-NR01 LK-02 REQ-402 new member bank transfer activates Portal and the same persisted Admin fee', async ({
  page,
  context,
}) => {
  const created = await newMember(page);
  const gate = page.getByRole('dialog', { name: 'Gói dịch vụ', exact: true });
  await gate.getByRole('button', { name: /^Đăng ký thành viên ngay/ }).click();
  const pay = page.getByRole('dialog', { name: /^Thanh toán phí thành viên/ });
  const content = `${created.session.me.membershipFee?.transferRef} ${created.phone}`;
  await expect(pay).toContainText(content);
  await expect(pay).toContainText('600.000đ');
  await expect(pay).toContainText('không hoàn lại');
  const requestedAt = Date.now();
  await pay.getByRole('button', { name: 'Tôi đã chuyển khoản', exact: true }).click();
  await expect(pay.getByText('Đang đối soát giao dịch với Vietcombank…')).toBeVisible();
  // Fixture only: native receives a signed FakeBank webhook; MSW schedules its fake bank.
  if (onServer) await simulateTransfer(content);
  await expect(page.getByRole('status').filter({ visible: true })).toHaveText(
    /^Đã nhận 600\.000đ · tài khoản tự động kích hoạt đến/,
    { timeout: 20000 },
  );
  await expect(pay).toHaveCount(0);
  await expect(gate).toHaveCount(0);
  await page.locator('aside').getByRole('link', { name: 'Cộng đồng', exact: true }).click();
  await expect(page.getByText('Khám phá cộng đồng', { exact: true })).toBeVisible();

  const admin = await context.newPage();
  await admin.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await admin.locator('input[type=email]').fill('mai.hoang@opchub.community');
  await admin.locator('input[type=password]').fill('Admin@2026');
  await admin.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(admin).toHaveURL(/\/overview$/);
  await admin.locator('aside').getByText('Phí thành viên', { exact: true }).click();
  const listed = admin.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === '/v1/admin/fees' && url.searchParams.get('q') === created.email;
  });
  await admin.getByPlaceholder('Tìm tên, email...').fill(created.email);
  const response = await listed;
  expect(response.status()).toBe(200);
  const rows = pageSchema(feeRowSchema).parse(await response.json());
  expect(rows.total).toBe(1);
  const paid = rows.items[0];
  expect(paid).toMatchObject({
    userId: created.session.me.id,
    email: created.email,
    fullName: created.name,
    amount: 600000,
    status: 'active',
  });
  if (!paid?.paidAt || !paid.validUntil) throw new Error('Missing persisted payment period');
  const paidAt = Date.parse(paid.paidAt);
  expect(paidAt).toBeGreaterThanOrEqual(requestedAt);
  expect(paidAt).toBeLessThanOrEqual(Date.now());
  const end = new Date(paidAt);
  const day = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  end.setUTCDate(
    Math.min(day, new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate()),
  );
  expect(paid.validUntil).toBe(end.toISOString());
  const row = admin.locator('[data-m="tbl"]').getByRole('row').filter({ hasText: created.email });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Đang hiệu lực');
  const loaded = page.waitForResponse((r) => new URL(r.url()).pathname === '/v1/me/membership');
  await page.reload();
  const membership = myMembershipSchema.parse(await (await loaded).json());
  expect(membership).toMatchObject({
    status: 'active',
    validUntil: paid.validUntil,
    transferRef: created.session.me.membershipFee?.transferRef,
  });
  await expect(gate).toHaveCount(0);
});
