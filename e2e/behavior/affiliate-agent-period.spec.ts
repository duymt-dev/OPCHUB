import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { signInAffiliate } from './helpers/affiliate-session';

test.use({ affiliateDemo: true });

test('REQ-312 list bank, lifetime values and selected period survive F5, including all months', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-10-20T02:00:00Z'));
  await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
  await page.getByRole('tab', { name: /^Affiliate/ }).click();
  await page.getByPlaceholder('Tìm tên, mã giới thiệu, email...').fill('HAOPC');
  const row = page.getByRole('row').filter({ hasText: 'HAOPC' });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('LE THU HA · ACB · 2468 1357');
  await expect(row).toContainText('7.800.000đ');
  await expect(row).toContainText('750.000đ');
  const period = page.getByRole('combobox', { name: 'Hoa hồng theo tháng', exact: true });
  await period.click();
  await page.getByText('Tháng 09/2026', { exact: true }).last().click();
  await expect(page).toHaveURL(/month=2026-09/);
  await expect(row).toContainText('900.000đ');
  await expect(row.getByRole('cell', { name: '13', exact: true })).toBeVisible();
  await expect(row).toContainText('7.800.000đ');
  await expect(row).toContainText('6 khách');
  await expect(row).toContainText('Đã chi trả');
  await page.reload();
  await expect(row).toContainText('900.000đ');
  await expect(page.getByRole('columnheader', { name: 'HH 09/2026', exact: true })).toBeVisible();
  await period.click();
  await page.getByText('Tất cả tháng', { exact: true }).last().click();
  await expect(page).toHaveURL(/month=all/);
  await expect(row).toContainText('1.950.000đ');
  await expect(row).toContainText('13 khách');
  await page.reload();
  await expect(page).toHaveURL(/month=all/);
  await expect(row).toContainText('1.950.000đ');
  await expect(row).toContainText('7.800.000đ');
});
