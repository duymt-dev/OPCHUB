import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { signInAffiliate } from './helpers/affiliate-session';

test('B12 BR-464 labels appointment and revocation separately in email history', async ({
  page,
}) => {
  await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
  await page.getByRole('tab', { name: 'Cấu hình GĐ Vùng', exact: true }).click();
  const slot = page.locator('#regional-north');
  const candidate = slot.getByRole('combobox');
  await candidate.fill('Nguyễn Văn An');
  await page.getByRole('option', { name: /Nguyễn Văn An/ }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /OK|Đồng ý|Xác nhận/ })
    .click();
  await expect(slot.getByText('Nguyễn Văn An', { exact: true })).toBeVisible();
  await slot.getByRole('button', { name: 'Thu hồi', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /OK|Đồng ý|Xác nhận/ })
    .click();
  await expect(slot.getByText('Chưa bổ nhiệm', { exact: true })).toBeVisible();
  await page.goto(`${ADMIN_URL}/marketing?tab=log`);
  const log = page.getByRole('list', { name: 'Nhật ký gửi email', exact: true });
  await expect(log.getByText('Bổ nhiệm GĐ Vùng', { exact: true })).toBeVisible();
  await expect(log.getByText('Thu hồi GĐ Vùng', { exact: true }).first()).toBeVisible();
});

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
