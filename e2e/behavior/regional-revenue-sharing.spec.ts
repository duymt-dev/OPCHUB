import { test, expect, type Page } from '../server/test';
import { ADMIN_URL } from '../urls';

test.use({ revenueDemo: true });

async function openSharing(page: Page) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/overview$/);
  await page.goto(`${ADMIN_URL}/affiliate?tab=gdv`, { waitUntil: 'networkidle' });
}

async function revokeNorth(page: Page) {
  await page.goto(`${ADMIN_URL}/affiliate?tab=gcfg`, { waitUntil: 'networkidle' });
  const north = page.getByRole('article', { name: 'Miền Bắc', exact: true });
  await north.getByRole('button', { name: 'Thu hồi', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Thu hồi GĐ Vùng Trần Quốc Bảo?' });
  await dialog.getByRole('button', { name: 'Thu hồi', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(north).toContainText('Chưa có GĐ Vùng');
}

test('REQ-617 AT-GDV04 D-122 years, retained debt, month payout and immutable history survive reload', async ({
  page,
}) => {
  await openSharing(page);
  const retained = page.getByRole('status', {
    name: 'Doanh thu Media Soft giữ lại (sau phần GĐ Vùng)',
    exact: true,
  });
  await expect(retained).toContainText('3.120.000đ');
  await expect(retained).not.toContainText('6.720.000đ');
  const identity = page.getByRole('button', { name: /Trần Quốc Bảo/ });
  await identity.click();
  const ledger = page.getByRole('region', { name: 'Khoản ghi nhận cho GĐ Vùng', exact: true });
  await expect(ledger.getByRole('row')).toHaveCount(5);
  for (const [name, year, rate, share] of [
    ['Khách chia sẻ năm một', '1', '50', '600.001đ'],
    ['Khách chia sẻ năm hai', '2', '40', '480.000đ'],
    ['Khách chia sẻ năm ba', '3', '30', '360.000đ'],
    ['Khách chia sẻ năm bốn', '4', '20', '240.000đ'],
  ] as const) {
    const row = ledger.getByRole('row').filter({ hasText: name });
    await expect(row).toContainText(`${rate}% · Năm ${year}`);
    await expect(row).toContainText(share);
    await expect(row).toContainText('Chờ chi cuối tháng');
  }
  await expect(ledger).not.toContainText('Khách đăng ký trực tiếp');
  await revokeNorth(page);
  await page.goto(`${ADMIN_URL}/affiliate?tab=gdv`, { waitUntil: 'networkidle' });
  await expect(retained).toContainText('3.120.000đ');
  await page.getByRole('button', { name: 'GĐ Vùng đã thu hồi', exact: true }).click();
  const former = page.getByRole('region', { name: 'GĐ Vùng đã thu hồi', exact: true });
  await expect(former).toContainText('Trần Quốc Bảo');
  await expect(former).toContainText('1.680.001đ');
  await former.getByRole('button', { name: 'Chi trả', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Chi trả GĐ Vùng', exact: true });
  await expect(dialog).toContainText('TRAN QUOC BAO · Vietcombank · 001100104567');
  const month = dialog.getByRole('combobox', { name: 'Kỳ chi', exact: true });
  await month.click();
  await page.getByTitle('09/2026 · 1.680.001đ', { exact: true }).click();
  await dialog.getByRole('button', { name: 'Chi trả', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(former.getByRole('button', { name: 'Chi trả', exact: true })).toHaveCount(0);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(retained).toContainText('3.120.000đ');
  await page.getByRole('button', { name: 'GĐ Vùng đã thu hồi', exact: true }).click();
  await former.getByRole('button', { name: /Trần Quốc Bảo/ }).click();
  const history = former.getByRole('region', { name: 'Lịch sử chi trả', exact: true });
  await expect(history).toContainText('Tháng 09/2026');
  await expect(history.getByText('1.680.001đ', { exact: true })).toHaveCount(1);
  await expect(history).toContainText('TRAN QUOC BAO · Vietcombank · 001100104567');
  const paid = former.getByRole('region', { name: 'Khoản ghi nhận cho GĐ Vùng', exact: true });
  await expect(paid.getByRole('cell', { name: 'Đã chi trả', exact: true })).toHaveCount(4);
  await expect(former.getByRole('button', { name: 'Chi trả', exact: true })).toHaveCount(0);
});
