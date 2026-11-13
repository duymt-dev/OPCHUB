import { expect, test } from '../server/test';
import { ADMIN_URL, PORTAL_URL } from '../urls';

for (const [name, origin] of [
  ['Portal', PORTAL_URL],
  ['Admin', ADMIN_URL],
] as const) {
  test(`D-93 ${name} auth support and language wrap at390 and share a row at1440`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const support = page.getByRole('link', { name: 'Liên hệ', exact: true });
    const language = page.getByRole('button', { name: 'Việt Nam', exact: true });
    await expect(support).toBeVisible();
    await expect(language).toBeVisible();
    const smallSupport = await support.boundingBox();
    const smallLanguage = await language.boundingBox();
    if (!smallSupport || !smallLanguage) throw new Error('Missing mobile controls');
    expect(smallLanguage.y).toBeGreaterThan(smallSupport.y + smallSupport.height);
    expect(smallLanguage.x + smallLanguage.width).toBeLessThanOrEqual(390);
    await language.click();
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await page.setViewportSize({ width: 1440, height: 900 });
    const wideSupport = await support.boundingBox();
    const wideLanguage = await language.boundingBox();
    if (!wideSupport || !wideLanguage) throw new Error('Missing desktop controls');
    expect(
      Math.abs(wideSupport.y + wideSupport.height / 2 - wideLanguage.y - wideLanguage.height / 2),
    ).toBeLessThanOrEqual(2);
    await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();
  });
}
