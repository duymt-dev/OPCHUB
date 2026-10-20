import type { TestInfo } from '@playwright/test';
import { expect, type Locator, type Page } from '../../server/test';

/** SRS-only dialogs: real UI captures, never a fabricated prototype comparison. */
export async function captureAffiliateDialog(
  page: Page,
  dialog: Locator,
  width: number,
  name: string,
  info: TestInfo,
) {
  await expect(dialog).toBeVisible();
  const controls = [dialog, ...(await dialog.locator('input, textarea, button').all())];
  for (const control of controls) {
    await expect(control).toBeVisible();
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    if (!box) throw new Error('Dialog control has no layout box');
    expect(box.width).toBeGreaterThan(0);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
  }
  const path = info.outputPath(`${name}-${width}.png`);
  await page.screenshot({ path, animations: 'disabled', caret: 'hide' });
  await info.attach(`${name}-${width}`, {
    path,
    contentType: 'image/png',
  });
}
