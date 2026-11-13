import { expect, test } from '@playwright/test';
import type { CDPSession } from '@playwright/test';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { languageOptions } from '@opchub/shared/fixtures';
import { ADMIN_URL } from '../urls';
import { env } from '../env';

const SCRIPTS: Record<string, string> = {
  zh: 'SC',
  th: 'Thai',
  km: 'Khmer',
  lo: 'Lao',
  my: 'Myanmar',
};

async function customFonts(cdp: CDPSession, nodeId: number) {
  const result = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
  const fonts = result.fonts.filter((font) => font.glyphCount > 0);
  expect(fonts.length).toBeGreaterThan(0);
  expect(fonts.every((font) => font.isCustomFont)).toBe(true);
  return fonts.map((font) => ({ family: font.familyName, glyphs: font.glyphCount }));
}

for (const option of languageOptions) {
  for (const width of [1440, 390]) {
    test(`D-141 AC824-15/16 fonts only: ${option.code} ${width}, not catalog acceptance`, async ({
      page,
      context,
    }) => {
      const faults: string[] = [];
      const downloads = new Set<string>();
      page.on('pageerror', (error) => faults.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') faults.push(message.text());
      });
      page.on('response', (response) => {
        if (/\.woff2(?:\?|$)/.test(response.url())) {
          expect(response.ok()).toBe(true);
          downloads.add(new URL(response.url()).pathname.split('/').at(-1) ?? '');
        }
      });
      await page.setViewportSize({ width, height: 1000 });
      await context.addCookies([{ name: 'NEXT_LOCALE', value: option.code, url: ADMIN_URL }]);
      await page.goto(`${ADMIN_URL}/login`);
      await expect(page.locator('html')).toHaveAttribute('lang', option.code);
      const trigger = page.locator('button[aria-haspopup=listbox]');
      await expect(trigger).toContainText(option.country);
      // The selector can arrive before streamed login/provider content discovers Latin fonts.
      await expect(page.locator('input[autocomplete=username]')).toBeVisible();
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      const expected = SCRIPTS[option.code];
      const initial = [...downloads];
      expect(initial.some((name) => name.startsWith('NotoSans-Regular.'))).toBe(true);
      const scriptFonts = initial.filter((name) =>
        /^NotoSans(?:SC|Thai|Khmer|Lao|Myanmar)-Regular\./.test(name),
      );
      expect(scriptFonts).toHaveLength(expected ? 1 : 0);
      if (expected) expect(scriptFonts[0]).toMatch(new RegExp(`^NotoSans${expected}-Regular\\.`));
      const cdp = await context.newCDPSession(page);
      await cdp.send('DOM.enable');
      await cdp.send('CSS.enable');
      const { root } = await cdp.send('DOM.getDocument');
      const { nodeId } = await cdp.send('DOM.querySelector', {
        nodeId: root.nodeId,
        selector: 'button[aria-haspopup=listbox]',
      });
      const current = await customFonts(cdp, nodeId);
      await trigger.click();
      await expect(page.getByRole('option')).toHaveCount(12);
      await page.evaluate(() => document.fonts.ready);
      const { nodeIds } = await cdp.send('DOM.querySelectorAll', {
        nodeId: root.nodeId,
        selector: 'button[role=option] > span > span',
      });
      // CDP reports immediate child TextNodes, not the button's nested label descendants.
      expect(nodeIds).toHaveLength(24);
      const menu = await Promise.all(nodeIds.map((id) => customFonts(cdp, id)));
      const bounds = await page.getByRole('listbox').evaluate((node) => {
        const rect = node.parentElement?.getBoundingClientRect();
        return rect ? { top: rect.top, bottom: rect.bottom } : null;
      });
      expect(bounds?.top ?? -1).toBeGreaterThanOrEqual(0);
      expect(bounds?.bottom ?? Infinity).toBeLessThanOrEqual(1000);
      expect([...downloads].filter((name) => !initial.includes(name))).toHaveLength(1);
      expect([...downloads].some((name) => name.startsWith('LanguageMenu-Regular.'))).toBe(true);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('option')).toHaveCount(0);
      expect(faults).toEqual([]);
      if (option.code === 'th') {
        // Auth/meta only: full Thai raw inventory does not prove all-screen browser acceptance.
        await expect(
          page.getByRole('heading', { name: 'ยินดีต้อนรับกลับมา!', exact: true }),
        ).toBeVisible();
        await expect(page).toHaveTitle(/^เข้าสู่ระบบ/);
        const directory = fileURLToPath(
          new URL('../../coding-packs/reports/evidence/v46-824/', import.meta.url),
        );
        mkdirSync(directory, { recursive: true });
        await page.screenshot({
          path: resolve(directory, `th-auth-${env.E2E_TARGET}-${width}.png`),
          fullPage: true,
          animations: 'disabled',
        });
      }
      if (option.code === 'fil') {
        // Auth/meta rendering only; complete raw files do not prove all-screen browser acceptance.
        await expect(
          page.getByRole('heading', { name: 'Maligayang pagbabalik!', exact: true }),
        ).toBeVisible();
        await expect(page).toHaveTitle(/^Mag-sign in/);
      }
      if (option.code === 'km') {
        // Complete auth/meta files only; the remaining Khmer domains are still incomplete.
        await expect(
          page.getByRole('heading', { name: 'សូមស្វាគមន៍ការត្រឡប់មកវិញ!', exact: true }),
        ).toBeVisible();
        await expect(page).toHaveTitle('ចូលប្រើ · OPC Hub Admin');
        const directory = fileURLToPath(
          new URL('../../coding-packs/reports/evidence/v46-824/', import.meta.url),
        );
        mkdirSync(directory, { recursive: true });
        await page.screenshot({
          path: resolve(directory, `km-auth-${env.E2E_TARGET}-${width}.png`),
          fullPage: true,
          animations: 'disabled',
        });
      }
      if (option.code === 'my') {
        // Public auth/meta only; eight Myanmar business catalogs remain incomplete.
        await expect(
          page.getByRole('heading', { name: 'ပြန်လည်ကြိုဆိုပါသည်!', exact: true }),
        ).toBeVisible();
        await expect(page).toHaveTitle('အကောင့်ဝင်ရန် · OPC Hub Admin');
        const directory = fileURLToPath(
          new URL('../../coding-packs/reports/evidence/v46-824/', import.meta.url),
        );
        mkdirSync(directory, { recursive: true });
        await page.screenshot({
          path: resolve(directory, `my-auth-${env.E2E_TARGET}-${width}.png`),
          fullPage: true,
          animations: 'disabled',
        });
      }
      if (option.code === 'ms' || option.code === 'ms-BN') {
        await expect(
          page.getByRole('heading', { name: 'Selamat kembali!', exact: true }),
        ).toBeVisible();
        await expect(page).toHaveTitle(/^Log masuk/);
      }
      if (option.code === 'id') {
        await expect(
          page.getByRole('heading', { name: 'Selamat datang kembali!', exact: true }),
        ).toBeVisible();
        await expect(page).toHaveTitle(/^Masuk/);
      }
      if (option.code === 'zh') {
        await expect(page.getByRole('heading', { name: '欢迎回来！', exact: true })).toBeVisible();
        await expect(page).toHaveTitle(/^登录/);
        const directory = fileURLToPath(
          new URL('../../coding-packs/reports/evidence/v46-824/', import.meta.url),
        );
        mkdirSync(directory, { recursive: true });
        await page.screenshot({
          path: resolve(directory, `zh-auth-${env.E2E_TARGET}-${width}.png`),
          fullPage: true,
          animations: 'disabled',
        });
      }
      await test.info().attach('font-proof', {
        body: JSON.stringify({ initial, all: [...downloads], current, menu }),
        contentType: 'application/json',
      });
    });
  }
}
