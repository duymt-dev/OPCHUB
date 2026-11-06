import { expect, type Page } from '@playwright/test';

/** Drain queued tab renders before canceling their smooth scroll; leave all content intact. */
export async function settleScrollAtTop(page: Page) {
  await page.clock.runFor(1000);
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  await expect
    .poll(() => page.evaluate(() => ({ x: window.scrollX, y: window.scrollY })))
    .toEqual({ x: 0, y: 0 });
}
