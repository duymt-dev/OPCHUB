import { expect, type Page } from '@playwright/test';

/** Drain queued renders and cancel compositor scrolling without hiding any content. */
export async function settleScrollAtTop(page: Page) {
  await page.clock.runFor(1000);
  let settledSamples = 0;
  await expect
    .poll(async () => {
      await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
      await page.clock.runFor(100);
      const position = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
      settledSamples = position.x === 0 && position.y === 0 ? settledSamples + 1 : 0;
      return settledSamples;
    })
    .toBeGreaterThanOrEqual(3);
}
