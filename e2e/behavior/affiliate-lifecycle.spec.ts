import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { signInAffiliate } from './helpers/affiliate-session';
import {
  registerReferral,
  payAndOpenAffiliate,
  ownerSignIn,
} from './helpers/affiliate-registration';

test.use({ affiliateDemo: true });

test('AT-AF02 BUG-045 REQ-303 REQ-309 first fee creates an Admin agent and one commission visible on both sides', async ({
  page,
  context,
}) => {
  const email = await registerReferral(page);
  await payAndOpenAffiliate(page);
  await expect(
    page.getByText('Chưa có số tài khoản nhận hoa hồng.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cập nhật ngay', exact: true }).click();
  await page.getByLabel('Ngân hàng', { exact: true }).selectOption('ACB');
  await page.getByLabel('Số tài khoản', { exact: true }).fill('135792468');
  await page.getByLabel('Tên chủ tài khoản', { exact: true }).fill('nguyễn affiliate trà my');
  await expect(page.getByLabel('Tên chủ tài khoản', { exact: true })).toHaveValue(
    'NGUYEN AFFILIATE TRA MY',
  );
  await page.getByRole('button', { name: 'Lưu tài khoản' }).click();
  await expect(page.getByText('ACB · 135792468', { exact: true })).toBeVisible();
  await expect(page.getByText('Chưa có số tài khoản nhận hoa hồng.', { exact: true })).toHaveCount(
    0,
  );
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Đã gửi email chào mừng' })).toHaveCount(0);
  await expect(page.getByText('ACB · 135792468', { exact: true })).toBeVisible();
  const admin = await context.newPage();
  await signInAffiliate(admin, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
  await admin.getByRole('tab', { name: /^Affiliate/ }).click();
  await admin.getByPlaceholder('Tìm tên, mã giới thiệu, email...').fill(email);
  const agent = admin.getByRole('row').filter({ hasText: email });
  await expect(agent).toHaveCount(1);
  await expect(agent).toContainText('Nguyễn Affiliate Trà My');
  await expect(agent).toContainText('Tự động');
  await admin.getByRole('tab', { name: /^Hoa hồng/ }).click();
  await admin.getByPlaceholder('Tìm thành viên hoặc affiliate...').fill('Nguyễn Affiliate Trà My');
  await expect(admin).toHaveURL((url) => url.searchParams.get('q') === 'Nguyễn Affiliate Trà My');
  const commission = admin.getByRole('row').filter({ hasText: 'Nguyễn Affiliate Trà My' });
  await expect(commission).toHaveCount(1);
  await expect(commission).toContainText('Lê Thu Hà');
  await expect(commission).toContainText('150.000đ');
  await expect(commission).toContainText('Đã ghi nhận');
  await admin.reload();
  await expect(admin).toHaveURL((url) => url.searchParams.get('q') === 'Nguyễn Affiliate Trà My');
  await expect(commission).toHaveCount(1);
  await ownerSignIn(page);
  await expect(page.getByText('HAOPC', { exact: true })).toBeVisible();
  const row = page.getByRole('row').filter({ hasText: 'Nguyễn Affiliate Trà M.' });
  await expect(row).toBeVisible({ timeout: 20_000 });
  await expect(row.getByRole('cell', { name: '600.000đ', exact: true })).toBeVisible();
  await expect(row.getByRole('cell', { name: '150.000đ', exact: true })).toBeVisible();
  await expect(row.getByText('Đã ghi nhận', { exact: true })).toBeVisible();
});
