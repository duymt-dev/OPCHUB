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
    title: 'ခြုံငုံသုံးသပ်ချက်',
    heading: 'ခြုံငုံသုံးသပ်ချက်',
    anchors: ['အဖွဲ့ဝင်တိုးတက်မှု', 'ဒေသအလိုက် အခမဲ့ → အခကြေးငွေသို့ ပြောင်းလဲမှု'],
  },
  {
    path: '/profile',
    id: 'profile',
    title: 'ကိုယ်ရေးပရိုဖိုင်',
    heading: 'ကိုယ်ရေးပရိုဖိုင်',
    anchors: ['ကိုယ်ရေးအချက်အလက်', 'စကားဝှက် ပြောင်းရန်', 'လုံခြုံရေးအချက်အလက်နှင့် အခန်းကဏ္ဍ'],
  },
  {
    path: '/settings',
    id: 'settings',
    title: 'ဆက်တင်များနှင့် ခွင့်ပြုချက်များ',
    heading: 'စနစ်ဆက်တင်များ',
    anchors: ['ပလက်ဖောင်းအချက်အလက်', 'စာရင်းသွင်းခြင်းနှင့် ပါဝင်ခြင်း'],
  },
] as const;

for (const screen of SCREENS)
  for (const width of [1440, 390]) {
    test(`D-141 AC824-07/15 Myanmar core ${screen.id} ${width}, not missing8-domain/full acceptance`, async ({
      page,
      guard,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await openLocalized(page, screen.path, 'my');
      await expect(page).toHaveTitle(`${screen.title} · OPC Hub Admin`);
      await expect(
        page.getByRole('heading', { name: screen.heading, level: 1, exact: true }),
      ).toBeVisible();
      for (const anchor of screen.anchors)
        await expect(page.getByText(anchor, { exact: true }).first()).toBeVisible();
      // Vietnamese-chrome scanner is not Myanmar fluency; exact Myanmar anchors required.
      await englishChrome(page, guard);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await expect(
        page.getByRole('status').filter({ hasText: 'စီမံခန့်ခွဲမှုဒက်ရှ်ဘုတ်သို့ အကောင့်ဝင်ရန်' }),
      ).toBeHidden();
      await page.evaluate(() => document.fonts.ready);
      if (width === 1440) await assertSidebarLabels(page.locator('aside[data-mini]'));
      mkdirSync(evidence, { recursive: true });
      await page.screenshot({
        path: resolve(evidence, `my-${screen.id}-${env.E2E_TARGET}-${width}.png`),
        fullPage: true,
        animations: 'disabled',
      });
    });
  }
