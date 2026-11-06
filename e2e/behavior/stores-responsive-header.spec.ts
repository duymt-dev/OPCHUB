import { expect, test } from '../server/test';
import { ADMIN_URL } from '../urls';
import { signInAffiliate } from './helpers/affiliate-session';

for (const width of [390, 1440]) {
  test(`TIP-812 Stores title and usable date range share a row at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    await page.goto(`${ADMIN_URL}/stores`, { waitUntil: 'networkidle' });
    const header = page.locator('[data-store-header]');
    const title = header.getByRole('heading', { name: 'Gian hàng', exact: true });
    const range = header.locator('.ant-picker-range');
    await expect(title).toBeVisible();
    await expect(range).toBeVisible();
    const a = await title.boundingBox();
    const b = await range.boundingBox();
    if (!a || !b) throw new Error('Missing Stores header controls');
    expect(b.y).toBeLessThan(a.y + a.height);
    expect(b.y + b.height).toBeGreaterThan(a.y);
    expect(b.x).toBeGreaterThanOrEqual(a.x + a.width);
    expect(b.x + b.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    const dates = range.getByRole('textbox');
    await expect(dates.nth(0)).toHaveValue('01/10/2026');
    await expect(dates.nth(1)).toHaveValue('15/10/2026');
    await dates.nth(0).click();
    await expect(page.locator('.ant-picker-dropdown').filter({ visible: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dates.nth(0)).toHaveValue('01/10/2026');
  });
}
