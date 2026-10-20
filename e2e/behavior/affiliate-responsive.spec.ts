import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { signInAffiliate, openAffiliateDetail } from './helpers/affiliate-session';

test.use({ affiliateDemo: true, viewport: { width: 390, height: 844 } });

test('REQ-312 UI-404-03 mobile Affiliate search and statuses stay inside the viewport', async ({
  page,
}) => {
  await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
  const search = page.getByPlaceholder('Tìm thành viên hoặc affiliate...');
  await expect(search).toBeVisible();
  // The inner input can fit while its compact wrapper overflows and is clipped by the shell.
  const box = await page.locator('.ant-input-search').filter({ visible: true }).boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
  const cancelledFilter = page.getByRole('radio', { name: /^Đã hủy/ });
  await cancelledFilter.check();
  await expect(cancelledFilter).toBeChecked();
  await expect(page).toHaveURL(/status=cancelled/);
  const cancelled = page.getByRole('row').filter({ hasText: 'Đỗ Minh Tuấn' });
  await expect(cancelled).toHaveCount(1);
  await expect(cancelled.getByText('Đã hủy', { exact: true })).toBeVisible();
  await expect(cancelled.getByRole('cell', { name: '600.000đ', exact: true })).toBeVisible();
  await expect(cancelled.getByRole('cell', { name: '150.000đ', exact: true })).toBeVisible();
  await cancelled.getByRole('checkbox').check();
  await expect(cancelled.getByRole('checkbox')).toBeChecked();
  await page.getByRole('button', { name: 'Bỏ chọn', exact: true }).click();
  await expect(cancelled.getByRole('checkbox')).not.toBeChecked();
  await page.reload();
  await expect(search).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await openAffiliateDetail(page, 'HAOPC', 'Lê Thu Hà');
  await expect(page.getByRole('button', { name: 'Sửa (Admin)', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
