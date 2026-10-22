import { expect, type Page } from '../../server/test';

const NO_MATCH = 'ZZZ_NO_AFFILIATE_MATCH_2026';

/** Shared by D-84-COM-EMPTY / D-84-AFF-EMPTY: guidance stays, but as one compact line. */
export async function expectCompactEmpty(page: Page, placeholder: string, width: number) {
  const rows = page.locator('tbody tr[data-row-key]');
  // Positive control: the list has rows before the no-match search.
  await expect(rows.first()).toBeVisible();
  await page.getByPlaceholder(placeholder).fill(NO_MATCH);
  await expect(rows).toHaveCount(0);
  const empty = page.locator('tr.ant-table-placeholder');
  await expect(empty).toBeVisible();
  await expect(empty).toContainText('Chưa có dữ liệu');
  const box = await empty.boundingBox();
  if (!box) throw new Error('Empty guidance must be laid out');
  if (width < 768) {
    expect(box.height).toBeLessThanOrEqual(28);
    // Mobile card header is white like the row cards, not the desktop grey header band.
    for (const th of await page.locator('.ant-table-thead > tr > th').all())
      if (await th.isVisible())
        await expect(th).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    width,
  );
  await page.getByPlaceholder(placeholder).fill('');
  await expect(rows.first()).toBeVisible();
}
