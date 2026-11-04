import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { signInAffiliate } from './helpers/affiliate-session';

test('D-78-GDV system appointment and revocation email templates are always enabled and read-only', async ({
  page,
}) => {
  await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
  await page.goto(`${ADMIN_URL}/marketing?tab=auto`);
  const panel = page.getByRole('region', { name: 'Email hệ thống · GĐ Vùng', exact: true });
  await expect(panel).toBeVisible();
  await expect(panel.getByText('EM-GDV1', { exact: true })).toBeVisible();
  await expect(panel.getByText('EM-GDV2', { exact: true })).toBeVisible();
  await expect(panel.getByText('Đang bật', { exact: true })).toHaveCount(2);
  await expect(panel.getByRole('button')).toHaveCount(0);
  await expect(panel.getByRole('checkbox')).toHaveCount(0);
  await expect(panel).toContainText('Không gửi mật khẩu.');
});
