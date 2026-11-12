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
    title: 'ទិដ្ឋភាពទូទៅ',
    heading: 'ទិដ្ឋភាពទូទៅ',
    anchors: ['កំណើនសមាជិក', 'ការប្ដូរពីឥតគិតថ្លៃ → បង់ប្រាក់តាមតំបន់'],
  },
  {
    path: '/profile',
    id: 'profile',
    title: 'ប្រវត្តិរូបផ្ទាល់ខ្លួន',
    heading: 'ប្រវត្តិរូបផ្ទាល់ខ្លួន',
    anchors: ['ព័ត៌មានផ្ទាល់ខ្លួន', 'ប្ដូរពាក្យសម្ងាត់', 'ព័ត៌មានសុវត្ថិភាព និងតួនាទី'],
  },
  {
    path: '/settings',
    id: 'settings',
    title: 'ការកំណត់ និងសិទ្ធិចូលប្រើ',
    heading: 'ការកំណត់ប្រព័ន្ធ',
    anchors: ['ព័ត៌មានវេទិកា', 'ការចុះឈ្មោះ និងចូលរួម'],
  },
] as const;

for (const screen of SCREENS)
  for (const width of [1440, 390]) {
    test(`D-141 AC824-07/15 Khmer actual ${screen.id} ${width}, not all-language acceptance`, async ({
      page,
      guard,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await openLocalized(page, screen.path, 'km');
      await expect(page).toHaveTitle(`${screen.title} · OPC Hub Admin`);
      await expect(
        page.getByRole('heading', { name: screen.heading, level: 1, exact: true }),
      ).toBeVisible();
      for (const anchor of screen.anchors)
        await expect(page.getByText(anchor, { exact: true }).first()).toBeVisible();
      // Detect untranslated Vietnamese chrome, not Khmer fluency; exact Khmer anchors required.
      await englishChrome(page, guard);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await expect(page.getByRole('status').filter({ hasText: 'ចូលផ្ទាំងគ្រប់គ្រង' })).toBeHidden();
      await page.evaluate(() => document.fonts.ready);
      if (width === 1440) await assertSidebarLabels(page.locator('aside[data-mini]'));
      mkdirSync(evidence, { recursive: true });
      await page.screenshot({
        path: resolve(evidence, `km-${screen.id}-${env.E2E_TARGET}-${width}.png`),
        fullPage: true,
        animations: 'disabled',
      });
    });
  }
