import { expect, type Locator, type Page } from '@playwright/test';

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

/** Normalize an actual scroll ancestor, without scrolling the surrounding document. */
export async function settleInnerScroll(page: Page, marker: Locator, edge: 'top' | 'bottom') {
  await page.clock.runFor(1000);
  let samples = 0;
  await expect
    .poll(async () => {
      const settled = await marker.evaluate((node, target) => {
        let parent = node.parentElement;
        while (parent && !/auto|scroll/.test(getComputedStyle(parent).overflowY))
          parent = parent.parentElement;
        if (!parent) throw new Error('Missing scroll container');
        const top = target === 'top' ? 0 : Math.max(0, parent.scrollHeight - parent.clientHeight);
        parent.scrollTo({ top, behavior: 'instant' });
        return parent.scrollTop === top;
      }, edge);
      await page.clock.runFor(100);
      samples = settled ? samples + 1 : 0;
      return samples;
    })
    .toBeGreaterThanOrEqual(3);
}

/** Drawer headers are outside the scroll body: normalize areas in the actual panel. */
export async function settleDrawerScroll(page: Page, marker: Locator) {
  await page.clock.runFor(1000);
  await expect
    .poll(() =>
      marker.evaluate((node) => {
        let root: Element | null = node.closest('[role=dialog]');
        if (!root) {
          root = node.parentElement;
          while (root && getComputedStyle(root).position !== 'fixed') root = root.parentElement;
        }
        if (!root) throw new Error('Missing drawer');
        const scrolls = [root, ...root.querySelectorAll('*')].filter((element) =>
          /auto|scroll/.test(getComputedStyle(element).overflowY),
        );
        for (const element of scrolls) element.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        return scrolls.every((element) => element.scrollTop === 0 && element.scrollLeft === 0);
      }),
    )
    .toBe(true);
}
