import { expect, test } from '../server/test';
import { PORTAL_URL } from '../urls';
import { login } from './project-helpers';

test('B15 dashboard products preserve two mobile columns without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.goto(`${PORTAL_URL}/stores/mine`);
  const items = page.locator('[data-block="store-dashboard-items"]');
  await expect(items).toBeVisible();
  expect(await items.locator(':scope > div').count()).toBeGreaterThanOrEqual(2);
  const layout = () =>
    items.evaluate((grid) => ({
      columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      cardsFit: [...grid.children].every((card) => card.scrollWidth <= card.clientWidth),
    }));
  await expect.poll(layout).toEqual({ columns: 2, overflow: false, cardsFit: true });
  await expect(page.locator('[data-kpi="guest-views"]')).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(async () => (await layout()).columns).toBeGreaterThanOrEqual(2);
  await expect.poll(async () => (await layout()).overflow).toBe(false);
});
