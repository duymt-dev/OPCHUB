import { test, expect, type Page } from '../server/test';
import { ADMIN_URL, PORTAL_URL } from '../urls';

test.use({ affiliateDemo: true });
async function login(page: Page, origin: string, email: string, password: string) {
  await page.goto(`${origin}/login`);
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.goto(`${origin}/affiliate`);
}

test('REQ-308 REQ-309 REQ-310 REQ-410 bank/rate/policy cross Portal and Admin origins and survive F5', async ({
  page,
  context,
}) => {
  await login(page, PORTAL_URL, 'ha.le@opcmedia.vn', 'User@2026');
  await expect(page.getByText('HAOPC', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sửa', exact: true }).click();
  await page.getByLabel('Ngân hàng', { exact: true }).selectOption('BIDV');
  await page.getByLabel('Số tài khoản', { exact: true }).fill('715917091871');
  await page.getByLabel('Tên chủ tài khoản', { exact: true }).fill('LE THU HA');
  await page.getByRole('button', { name: 'Lưu tài khoản', exact: true }).click();
  await expect(page.getByText('BIDV · 715917091871', { exact: true })).toBeVisible();

  const admin = await context.newPage();
  await login(admin, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
  await admin.getByRole('tab', { name: /^Affiliate/ }).click();
  await admin.getByPlaceholder('Tìm tên, mã giới thiệu, email...').fill('HAOPC');
  await admin.getByRole('link', { name: 'Lê Thu Hà', exact: true }).click();
  await expect(admin.getByLabel('Tài khoản nhận hoa hồng', { exact: true })).toContainText(
    'BIDV · 715917091871',
  );
  await admin.getByRole('button', { name: 'Sửa (Admin)', exact: true }).click();
  const dialog = admin.getByRole('dialog', { name: 'Đặt tỷ lệ hoa hồng', exact: true });
  await dialog.getByRole('spinbutton', { name: 'Tỷ lệ hoa hồng (%)', exact: true }).fill('31');
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await admin.reload();
  await expect(admin.getByText('31%', { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Giới thiệu thành viên mới, nhận 31% hoa hồng' }),
  ).toBeVisible();
  await expect(page.getByText('BIDV · 715917091871', { exact: true })).toBeVisible();

  await admin.goto(`${ADMIN_URL}/affiliate?tab=cfg`);
  await admin
    .getByRole('spinbutton', { name: 'Thời gian ghi nhận link (ngày)', exact: true })
    .fill('45');
  await admin.getByRole('button', { name: 'Lưu chính sách', exact: true }).click();
  await expect(
    admin.getByRole('status').filter({ hasText: 'Đã lưu chính sách affiliate' }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Link được ghi nhận trong 45 ngày/)).toBeVisible();
  // Existing paid bank snapshots must not become the newly edited live bank.
  await page.getByRole('tab', { name: /^Lịch sử nhận tiền/ }).click();
  await expect(page.getByText('ACB · 24681357', { exact: true }).first()).toBeVisible();

  await admin.goto(`${ADMIN_URL}/affiliate`);
  await admin.getByPlaceholder('Tìm thành viên hoặc affiliate...').fill('Kiều Văn Sơn');
  // Two AF0 customers share this name, under different agents. Wait for both filtered
  // rows, not the one stale row on page 1 while the debounced query shows placeholder data.
  await expect(admin.getByRole('row').filter({ hasText: 'Kiều Văn Sơn' })).toHaveCount(2);
  const commission = admin
    .getByRole('row')
    .filter({ hasText: 'Kiều Văn Sơn' })
    .filter({ hasText: 'Lê Thu Hà' });
  await expect(commission).toHaveCount(1);
  await commission.getByRole('checkbox').check();
  await admin.getByRole('button', { name: 'Hủy', exact: true }).click();
  const cancel = admin.getByRole('dialog', { name: 'Hủy hoa hồng', exact: true });
  await expect(cancel.getByRole('button', { name: 'Xác nhận', exact: true })).toBeDisabled();
  await cancel.getByLabel('Lý do hủy', { exact: true }).fill('Kiểm tra đồng bộ hai ứng dụng');
  await cancel.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(cancel).toHaveCount(0);
  await page.goto(`${PORTAL_URL}/affiliate`);
  const cancelled = page.getByRole('row').filter({ hasText: 'Kiều Văn S.' });
  await expect(cancelled).toContainText('Đã hủy');
  await expect(cancelled.locator('[title="Kiểm tra đồng bộ hai ứng dụng"]')).toBeVisible();
});
