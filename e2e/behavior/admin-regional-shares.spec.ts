import { test, expect, type Page } from '../server/test';
import { ADMIN_URL } from '../urls';
import { signInAffiliate } from './helpers/affiliate-session';
import { regionalShareSummarySchema } from '@opchub/shared/api-domains';
const money = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
async function open(page: Page, email = 'admin@opchub.community') {
  await signInAffiliate(page, ADMIN_URL, email, 'Admin@2026');
  const response = page.waitForResponse(
    (r) => r.url().includes('/admin/gdv/shares') && r.request().method() === 'GET',
  );
  await page.getByRole('tab', { name: /^GĐ Vùng\s*3$/ }).click();
  const data = regionalShareSummarySchema.parse(await (await response).json());
  await expect(page.getByRole('table', { name: 'Sổ chia sẻ GĐ Vùng' })).toBeVisible();
  return data;
}
test.describe('TIP-V46-802 regional share ledger UI', () => {
  test.use({ affiliateDemo: true });
  test('KPI matches API, expands eight receipts, keyset load more and payout history', async ({
    page,
  }) => {
    const data = await open(page);
    expect(data.kpi.count).toBeGreaterThan(8);
    await expect(page.getByTestId('regional-kpi-total')).toHaveText(money(data.kpi.total));
    await expect(page.getByTestId('regional-kpi-due')).toHaveText(money(data.kpi.due));
    await page.locator('[data-region="north"]').locator('button[aria-expanded]').click();
    const items = page.getByRole('table', { name: 'Khoản ghi nhận cho GĐ Vùng' });
    await expect(items.getByRole('row')).toHaveCount(9);
    await expect(page.getByText('Lịch sử chi trả', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /^\+ \d+ khoản khác$/ }).click();
    await expect(items.getByRole('row')).toHaveCount(17);
  });
  test('payout confirms closed months, shows exact receipt toast and reduces due KPI', async ({
    page,
  }) => {
    const data = await open(page);
    const north = data.rows.find((r) => r.region === 'north');
    expect(north?.due).toBeGreaterThan(0);
    await page
      .locator('[data-region="north"]')
      .getByRole('button', { name: /^Chi trả cho GĐ Vùng/ })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(north?.payees[0]?.bank?.bankHolder ?? '');
    await dialog.getByRole('button', { name: 'Chi trả', exact: true }).click();
    await expect(
      page.getByText(
        `Đã chi trả ${money(north?.due ?? 0)} cho GĐ Vùng Trần Quốc Bảo · TRAN QUOC BAO`,
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.getByTestId('regional-kpi-due')).toHaveText(
      money(data.kpi.due - (north?.due ?? 0)),
    );
    await page.reload();
    await expect(page.getByTestId('regional-kpi-due')).toHaveText(
      money(data.kpi.due - (north?.due ?? 0)),
    );
  });
  test('accent-insensitive search nam filters only southern region', async ({ page }) => {
    await open(page);
    await page.getByRole('textbox', { name: 'Tìm GĐ Vùng hoặc vùng...' }).fill('nam');
    await expect(page.locator('[data-region]')).toHaveCount(1);
    await expect(page.locator('[data-region="south"]')).toBeVisible();
  });
  test('accountant may pay', async ({ page }) => {
    await open(page, 'mai.hoang@opchub.community');
    await expect(
      page.locator('[data-region="north"]').getByRole('button', { name: /^Chi trả cho GĐ Vùng/ }),
    ).toBeVisible();
  });
  test('admin sees ledger but cannot pay', async ({ page }) => {
    await open(page, 'trang.pham@opchub.community');
    await expect(page.getByRole('button', { name: /^Chi trả cho GĐ Vùng/ })).toHaveCount(0);
  });
});
