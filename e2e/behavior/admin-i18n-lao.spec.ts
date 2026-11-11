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
    title: 'ພາບລວມ',
    heading: 'ພາບລວມ',
    anchors: ['ການເຕີບໂຕສະມາຊິກ', 'ການປ່ຽນຈາກຟຣີເປັນຈ່າຍເງິນຕາມພາກພື້ນ'],
  },
  {
    path: '/profile',
    id: 'profile',
    title: 'ໂປຣໄຟລ໌ສ່ວນຕົວ',
    heading: 'ໂປຣໄຟລ໌ສ່ວນຕົວ',
    anchors: ['ຂໍ້ມູນສ່ວນຕົວ', 'ປ່ຽນລະຫັດຜ່ານ', 'ຄວາມປອດໄພແລະບົດບາດ'],
  },
  {
    path: '/settings',
    id: 'settings',
    title: 'ຕັ້ງຄ່າແລະສິດ',
    heading: 'ຕັ້ງຄ່າລະບົບ',
    anchors: ['ຂໍ້ມູນແພລດຟອມ', 'ການລົງທະບຽນແລະເຂົ້າຮ່ວມ'],
  },
] as const;

for (const screen of SCREENS)
  for (const width of [1440, 390]) {
    test(`D-141 AC824-07/15 Lao actual ${screen.id} ${width}, not all-language acceptance`, async ({
      page,
      guard,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await openLocalized(page, screen.path, 'lo');
      await expect(page).toHaveTitle(`${screen.title} · OPC Hub Admin`);
      await expect(
        page.getByRole('heading', { name: screen.heading, level: 1, exact: true }),
      ).toBeVisible();
      for (const anchor of screen.anchors)
        await expect(page.getByText(anchor, { exact: true }).first()).toBeVisible();
      // This scanner detects Vietnamese chrome, not Lao fluency; Lao anchors above are required.
      await englishChrome(page, guard);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await expect(
        page.getByRole('status').filter({ hasText: 'ເຂົ້າລະບົບແດຊບອດຜູ້ດູແລ' }),
      ).toBeHidden();
      await page.evaluate(() => document.fonts.ready);
      if (width === 1440) await assertSidebarLabels(page.locator('aside[data-mini]'));
      mkdirSync(evidence, { recursive: true });
      await page.screenshot({
        path: resolve(evidence, `lo-${screen.id}-${env.E2E_TARGET}-${width}.png`),
        fullPage: true,
        animations: 'disabled',
      });
    });
  }
