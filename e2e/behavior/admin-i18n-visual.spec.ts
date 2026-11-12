import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { env } from '../env';
import { test, expect, openLocalized } from './admin-i18n/fixtures';
import { englishChrome } from './admin-i18n/chrome';
import { assertSidebarLabels } from './admin-i18n/sidebar';

const evidence = fileURLToPath(
  new URL('../../coding-packs/reports/evidence/v46-824/', import.meta.url),
);
const SCREENS = [
  {
    path: '/overview',
    id: 'overview',
    title: 'Pangkalahatang-ideya',
    heading: 'Pangkalahatang-ideya',
    anchors: ['Paglago ng mga miyembro', 'Paglipat mula libre tungo sa bayad ayon sa rehiyon'],
  },
  {
    path: '/profile',
    id: 'profile',
    title: 'Personal na profile',
    heading: 'Personal na profile',
    anchors: ['Personal na impormasyon', 'Palitan ang password', 'Seguridad at Tungkulin'],
  },
  {
    path: '/settings',
    id: 'settings',
    title: 'Mga Setting at Pahintulot',
    heading: 'Mga setting ng system',
    anchors: ['Mga detalye ng platform', 'Pagpaparehistro at Pagsali'],
  },
] as const;

for (const screen of SCREENS)
  for (const width of [1440, 390]) {
    test(`D-141 AC824-07/15 Filipino actual ${screen.id} ${width}, not all-language acceptance`, async ({
      page,
      guard,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await openLocalized(page, screen.path, 'fil');
      await expect(page).toHaveTitle(`${screen.title} · OPC Hub Admin`);
      await expect(
        page.getByRole('heading', { name: screen.heading, level: 1, exact: true }),
      ).toBeVisible();
      for (const anchor of screen.anchors)
        await expect(page.getByText(anchor, { exact: true }).first()).toBeVisible();
      // This scanner detects Vietnamese chrome, not English fluency; Filipino anchors above are required.
      await englishChrome(page, guard);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await expect(
        page.getByRole('status').filter({ hasText: 'Mag-sign in sa Admin Dashboard' }),
      ).toBeHidden();
      await page.evaluate(() => document.fonts.ready);
      if (width === 1440) await assertSidebarLabels(page.locator('aside[data-mini]'));
      mkdirSync(evidence, { recursive: true });
      await page.screenshot({
        path: resolve(evidence, `fil-${screen.id}-${env.E2E_TARGET}-${width}.png`),
        fullPage: true,
        animations: 'disabled',
      });
    });
  }
