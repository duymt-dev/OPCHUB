import { test, expect, openLocalized } from './admin-i18n/fixtures';
import { assertSidebarLabels } from './admin-i18n/sidebar';
import { fileURLToPath } from 'node:url';
import { env } from '../env';

const evidence = fileURLToPath(
  new URL('../../coding-packs/reports/evidence/v46-824/', import.meta.url),
);

for (const locale of ['vi', 'en', 'fil'] as const)
  for (const width of [1440, 390]) {
    test(`D-141 AC824-15 sidebar text and badges stay inside links, ${locale} ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await openLocalized(page, '/profile', locale);
      const sidebar = page.locator('aside[data-mini]');
      const labels = {
        vi: {
          collapse: 'Thu gọn sidebar',
          expand: 'Mở rộng sidebar',
          menu: 'Menu',
          profile: 'Hồ sơ cá nhân',
        },
        en: {
          collapse: 'Collapse sidebar',
          expand: 'Expand sidebar',
          menu: 'Menu',
          profile: 'My profile',
        },
        fil: {
          collapse: 'Paliitin ang sidebar',
          expand: 'Palakihin ang sidebar',
          menu: 'Menu',
          profile: 'Personal na profile',
        },
      }[locale];
      if (width === 390) await page.getByRole('button', { name: labels.menu, exact: true }).click();
      await expect(sidebar).toHaveCSS('width', width === 1440 ? '248px' : '272px');
      const layout = await assertSidebarLabels(sidebar);
      if (locale === 'vi') expect(layout.wrapped, 'Existing VI labels still fit one line').toBe(0);
      if (locale === 'fil')
        expect(layout.wrapped, 'Long copy must wrap, never be shortened').toBeGreaterThan(0);
      if (locale === 'fil') {
        await expect(
          page.getByRole('status').filter({ hasText: 'Mag-sign in sa Admin Dashboard' }),
        ).toBeHidden();
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({
          path: `${evidence}fil-sidebar-${env.E2E_TARGET}-${width}.png`,
          animations: 'disabled',
        });
      }
      const hrefs = await sidebar
        .locator('nav > a')
        .evaluateAll((links) => links.map((a) => a.getAttribute('href')));
      if (width === 1440) {
        await sidebar.getByRole('button', { name: labels.collapse, exact: true }).click();
        await expect(sidebar).toHaveAttribute('data-mini', 'true');
        await expect(sidebar).toHaveCSS('width', '76px');
        await expect(sidebar.locator('nav > a > span:first-of-type').first()).toBeHidden();
        await expect(sidebar.locator('nav > a > svg').first()).toBeVisible();
        await sidebar.getByRole('button', { name: labels.expand, exact: true }).click();
        await expect(sidebar).toHaveCSS('width', '248px');
        await assertSidebarLabels(sidebar);
      }
      expect(
        await sidebar
          .locator('nav > a')
          .evaluateAll((links) => links.map((a) => a.getAttribute('href'))),
      ).toEqual(hrefs);
      // Real keyboard activation navigates through the same handler and closes the mobile drawer.
      const overview = sidebar.locator('a[href="/overview"]');
      await overview.focus();
      await expect(overview).toBeFocused();
      await overview.press('Enter');
      await expect(page).toHaveURL(/\/overview$/);
      if (width === 390) await expect(sidebar).toHaveAttribute('data-open', 'false');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }

test('D-141 AC824-15 rejects internal clipping even when document width passes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openLocalized(page, '/profile', 'fil');
  const sidebar = page.locator('aside[data-mini]');
  await assertSidebarLabels(sidebar);
  const label = sidebar.locator('a[href="/fees"] > span:first-of-type');
  await label.evaluate((element) => {
    (element as HTMLElement).style.whiteSpace = 'nowrap';
  });
  try {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(assertSidebarLabels(sidebar)).rejects.toThrow('toBeLessThanOrEqual');
  } finally {
    await label.evaluate((element) => {
      (element as HTMLElement).style.removeProperty('white-space');
    });
  }
  await assertSidebarLabels(sidebar);
});
