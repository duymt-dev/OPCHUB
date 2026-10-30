import { expect, test } from '../server/test';
import { ADMIN_URL } from '../urls';

test('REQ-616 BR-464 P16 system director templates remain readonly after reload, outside campaign editors', async ({
  page,
}) => {
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/overview$/);
  await page.goto(`${ADMIN_URL}/marketing`, { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Email tự động', exact: true }).click();

  const catalogue = page.getByRole('region', { name: 'Email hệ thống · GĐ Vùng', exact: true });
  const table = catalogue.getByRole('table', { name: 'Email hệ thống · GĐ Vùng', exact: true });
  const verify = async () => {
    await expect(table.getByRole('row')).toHaveCount(2);
    await expect(table.getByRole('row').nth(0)).toContainText('EM-GDV1');
    await expect(table.getByRole('row').nth(0)).toContainText('Thông báo bổ nhiệm GĐ Vùng');
    await expect(table.getByRole('row').nth(1)).toContainText('EM-GDV2');
    await expect(table.getByRole('row').nth(1)).toContainText('Thông báo thu hồi GĐ Vùng');
    await expect(table.getByText('Đang bật', { exact: true })).toHaveCount(2);
    await expect(catalogue).toContainText('Không gửi mật khẩu.');
    await expect(catalogue.getByRole('button')).toHaveCount(0);
    await expect(catalogue.getByRole('textbox')).toHaveCount(0);
    await expect(catalogue.getByRole('checkbox')).toHaveCount(0);
    await expect(catalogue.getByRole('switch')).toHaveCount(0);
  };
  await verify();
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('tab', { name: 'Email tự động', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await verify();
});
