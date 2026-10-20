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
  await page.getByText('Đã hủy', { exact: true }).first().click();
  await expect(page).toHaveURL(/status=cancelled/);
  await expect(page.getByRole('row').filter({ hasText: 'Đỗ Minh Tuấn' })).toHaveCount(1);
  await page.reload();
  await expect(search).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await openAffiliateDetail(page, 'HAOPC', 'Lê Thu Hà');
  await expect(page.getByRole('button', { name: 'Sửa (Admin)', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
