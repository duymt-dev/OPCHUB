import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { env } from '../env';
import { test, expect, openLocalized } from './admin-i18n/fixtures';
import { englishChrome } from './admin-i18n/chrome';
import { assertSidebarLabels } from './admin-i18n/sidebar';
import { CORE_LOCALES, IMAGE_LOCALES, coreScreens } from './admin-i18n/core-labels';

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
        await openLocalized(page, screen.path, locale);
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
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
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
