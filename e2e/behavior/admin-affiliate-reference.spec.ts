import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { signInAffiliate } from './helpers/affiliate-session';
test.use({ affiliateDemo: true });
test('REQ-619 D-132 policy tables, hidden rates and live share preview', async ({ page }) => {
  await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
  await page.getByRole('tab', { name: 'Chính sách', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Tỷ lệ hoa hồng mặc định (%)' })).toHaveCount(
    0,
  );
  const years = page.getByRole('table', { name: 'Năm của khách' }),
    plans = page.getByRole('table', { name: 'Phần GĐ Vùng theo từng gói' });
  await expect(years.getByRole('row')).toHaveCount(5);
  await expect(plans).toContainText('600.000đ');
  await page.getByLabel('GĐ Vùng năm 1', { exact: true }).fill('60');
  await expect(plans).toContainText('720.000đ');
  await page.getByLabel('Giảm mỗi năm từ năm 2', { exact: true }).fill('0');
  await expect(years.getByRole('row')).toHaveCount(2);
  await expect(years).toContainText('Từ năm 1 trở đi');
});
test('REQ-619 D-131 commission reference banner and snapshot customer years', async ({ page }) => {
  await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
  await expect(page.getByRole('note')).toContainText(
    'Media Soft không chi trực tiếp cho affiliate',
  );
  const response = await page.request.get(`${ADMIN_URL}/affiliate`);
  expect(response.ok()).toBe(true);
  // Demo renewal years are explicit rows, not a client-side relabel of a legacy commission.
  await page.getByPlaceholder('Tìm thành viên hoặc affiliate...').fill('');
  await expect(page.getByText('10% · Năm 2 · gia hạn', { exact: true }).first()).toBeVisible();
});
test('REQ-619 D-121 region read only on desktop and mobile', async ({ page }) => {
  await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
  await page.goto(`${ADMIN_URL}/affiliate?tab=aff`);
  await page.getByPlaceholder('Tìm tên, mã giới thiệu, email...').fill('HAOPC');
  await expect(
    page.getByRole('columnheader', { name: 'Thuộc vùng (theo tỉnh)', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('combobox', { name: /vùng/i })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText(/Do vùng quản lý/).first()).toBeVisible();
});
