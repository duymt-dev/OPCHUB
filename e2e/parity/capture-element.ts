import type { Locator, Page } from '@playwright/test';

/** Preserve the exact element origin instead of adding a fractional-position-dependent border. */
export async function captureElement(
  page: Page,
  locator: Locator,
  options: Parameters<Locator['screenshot']>[0],
) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  if (
    box &&
    viewport &&
    box.x >= 0 &&
    box.y >= 0 &&
    box.x + box.width <= viewport.width &&
    box.y + box.height <= viewport.height
  ) {
    return page.screenshot({ ...options, clip: box });
  }
  // Large regions require Playwright's full-element capture, never a clipped viewport.
  return locator.screenshot(options);
}
