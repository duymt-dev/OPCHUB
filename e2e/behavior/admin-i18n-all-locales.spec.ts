import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { env } from '../env';
import { test, expect, openLocalized } from './admin-i18n/fixtures';
import { englishChrome } from './admin-i18n/chrome';
import { assertSidebarLabels } from './admin-i18n/sidebar';
import { CORE_LOCALES, IMAGE_LOCALES, coreScreens } from './admin-i18n/core-labels';
import { coreDataWaiter } from './admin-i18n/core-ready';

const evidence = fileURLToPath(
  new URL('../../coding-packs/reports/evidence/v46-824/', import.meta.url),
);

for (const locale of CORE_LOCALES)
  for (const screen of coreScreens(locale))
    for (const width of [1440, 390]) {
      test(`D-141 AC824-07/15 actual ${locale} ${screen.id} ${width}, loaded core only not all states`, async ({
        page,
        guard,
      }) => {
        await page.setViewportSize({ width, height: 1000 });
        const ready = coreDataWaiter(page, screen, locale);
        await openLocalized(page, screen.path, locale);
        await ready();
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(page).toHaveTitle(`${screen.title} · OPC Hub Admin`);
        await expect(
          page.getByRole('heading', { name: screen.heading, level: 1, exact: true }),
        ).toBeVisible();
        for (const anchor of screen.anchors)
          await expect(page.getByText(anchor, { exact: true }).first()).toBeVisible();
        expect(new URL(page.url()).pathname).toBe(screen.path);
        expect(
          (await page.context().cookies()).find((cookie) => cookie.name === 'NEXT_LOCALE')?.value,
        ).toBe(locale);
        if (locale !== 'vi') await englishChrome(page, guard);
        else await guard.settle(); // Vietnamese UI is intentional; retain every HTTP/write/error guard.
        let menuBounds: { left: number; right: number } | undefined;
        if (width === 390) {
          await page.locator('button[aria-haspopup="listbox"]').click();
          const choices = page.getByRole('listbox');
          await expect(choices.getByRole('option')).toHaveCount(12);
          menuBounds = await choices.locator('..').evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return { left: rect.left, right: rect.right };
          });
          await page.keyboard.press('Escape');
          await expect(choices).toBeHidden();
        }
        const layout = await page.evaluate(() => ({
          width: innerWidth,
          scroll: document.documentElement.scrollWidth,
          overflow: [...document.querySelectorAll('body *')]
            .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
            .slice(0, 18)
            .map((e) => ({
              tag: e.tagName,
              class: e.className,
              right: e.getBoundingClientRect().right,
              width: e.getBoundingClientRect().width,
              text: e.textContent?.slice(0, 70),
            })),
        }));
        const diagnostics = JSON.stringify({ ...layout, menuBounds });
        expect(layout.scroll, diagnostics).toBeLessThanOrEqual(layout.width);
        if (menuBounds) {
          expect(menuBounds.left, diagnostics).toBeGreaterThanOrEqual(0);
          expect(menuBounds.right, diagnostics).toBeLessThanOrEqual(width);
        }
        await page.evaluate(() => document.fonts.ready);
        if (width === 1440) await assertSidebarLabels(page.locator('aside[data-mini]'));
        if (IMAGE_LOCALES.has(locale)) {
          mkdirSync(evidence, { recursive: true });
          await page.screenshot({
            path: resolve(evidence, `${locale}-${screen.id}-${env.E2E_TARGET}-${width}.png`),
            fullPage: true,
            animations: 'disabled',
          });
        }
      });
    }
