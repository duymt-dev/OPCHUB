import { test, expect, openLocalized } from './admin-i18n/fixtures';
import { assertSidebarLabels } from './admin-i18n/sidebar';
import { fileURLToPath } from 'node:url';
import { env } from '../env';
import { selectLocale } from './admin-i18n/navigation';

const evidence = fileURLToPath(
  new URL('../../coding-packs/reports/evidence/v46-824/', import.meta.url),
);

for (const width of [1440, 390]) {
  test(`D-141 AC824-08 sidebar badge digits switch my/vi/en without changing counts ${width}; not Myanmar catalog acceptance`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openLocalized(page, '/profile?badge=raw#locale', 'en');
    const sidebar = page.locator('aside[data-mini]');
    const badges = sidebar.locator('nav > a:has(> span:nth-of-type(2))');
    const original = await badges.evaluateAll((links) =>
      links.map((link) => ({
        href: link.getAttribute('href'),
        count: Number(link.querySelector('span:nth-of-type(2)')?.textContent?.replaceAll(',', '')),
      })),
    );
    expect(original.length).toBeGreaterThan(0);
    for (const item of original) expect(item.count).toBeGreaterThan(0);
    for (const [locale, intl] of [
      ['my', 'my-MM'],
      ['vi', 'vi-VN'],
      ['en', 'en-GB'],
    ] as const) {
      await selectLocale(page, locale);
      // Missing Myanmar prose still falls back to VI. This checks the approved number boundary only.
      if (width === 390) await page.getByRole('button', { name: 'Menu', exact: true }).click();
      for (const item of original) {
        const badge = sidebar.locator(`a[href="${item.href}"] > span:nth-of-type(2)`);
        await expect(badge).toHaveText(new Intl.NumberFormat(intl).format(item.count));
      }
      await assertSidebarLabels(sidebar);
      expect(
        await badges.evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
      ).toEqual(original.map((item) => item.href));
      await expect(page).toHaveURL(/\/profile\?badge=raw#locale$/);
      if (width === 390) {
        // Real click in the uncovered right-hand overlay; no forced/covered-handler events.
        await page
          .locator('aside[data-mini] + div[data-open="true"]')
          .click({ position: { x: 380, y: 500 } });
        await expect(sidebar).toHaveAttribute('data-open', 'false');
      }
    }
  });
}

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
