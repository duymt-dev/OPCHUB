import { test, expect } from '../server/test';
import { PORTAL_URL } from '../urls';

test.use({ affiliateDemo: true });
for (const width of [1440, 390]) {
  test(`TIP-V46-804 banner opens read-only regional tab and F5 retains it at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${PORTAL_URL}/login`);
    await page
      .locator('input[autocomplete=username], input[type=email]')
      .fill('bao.tran@solobooks.vn');
    await page.locator('input[type=password]').fill('User@2026');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    await page.goto(`${PORTAL_URL}/affiliate`);
    await expect(page.getByText(/Bạn là Giám đốc Vùng/)).toBeVisible();
    await page.getByRole('button', { name: 'Xem Vùng của tôi', exact: true }).click();
    await expect(page).toHaveURL(/tab=reg/);
    await expect(page.getByRole('tab', { name: /Vùng của tôi/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByText('Chỉ xem', { exact: true })).toBeVisible();
    const panel = page.getByRole('tabpanel');
    const card = panel
      .locator('div')
      .filter({ has: page.getByText('Doanh thu thực thu của vùng', { exact: true }) })
      .last();
    const label = page.getByText('Doanh thu thực thu của vùng', { exact: true });
    await expect(label).toHaveCSS('font-size', '13px');
    await expect(card.locator('b').first()).toHaveCSS('font-size', '22px');
    if (width === 390) {
      const table = panel.getByRole('table').first();
      expect(Math.round((await table.boundingBox())?.width ?? 0)).toBe(560);
      const year = table.getByRole('columnheader').first();
      expect((await year.boundingBox())?.width).toBeLessThan(70);
    }
    await expect(
      page.getByRole('heading', { name: 'Phần được chia theo năm của khách' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Affiliate trong vùng · căn cứ để chia cho cấp dưới' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Lịch sử Media Soft chi trả theo tháng' }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.reload();
    await expect(page.getByRole('tab', { name: /Vùng của tôi/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('tabpanel').getByRole('button')).toHaveCount(0);
  });
}
test('TIP-V46-804 ordinary affiliate has two tabs and safe reg URL fallback', async ({ page }) => {
  await page.goto(`${PORTAL_URL}/login`);
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.goto(`${PORTAL_URL}/affiliate?tab=reg`);
  await expect(page.getByRole('tab', { name: /Thành viên đã giới thiệu/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('tab', { name: /Vùng của tôi/ })).toHaveCount(0);
  await expect(page.getByText('Hoa hồng 20%', { exact: true })).toBeVisible();
  await expect(page.getByText('Link ghi nhận 30 ngày', { exact: true })).toBeVisible();
});
