import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { languageOptions } from '@opchub/shared/fixtures';
import { ADMIN_URL } from '../urls';

function message(locale: 'vi' | 'en', key: string): string {
  const file = new URL(`../../apps/admin/messages/${locale}/auth.json`, import.meta.url);
  let value: unknown = JSON.parse(readFileSync(fileURLToPath(file), 'utf8'));
  for (const part of key.split('.')) {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, part)) throw new Error(key);
    value = (value as Record<string, unknown>)[part];
  }
  if (typeof value !== 'string') throw new Error(key);
  return value;
}

async function select(page: Page, code: 'vi' | 'en') {
  await page.locator('button[aria-haspopup=listbox]').click();
  const options = page.getByRole('option');
  await expect(options).toHaveCount(12);
  const index = languageOptions.findIndex((option) => option.code === code);
  expect(index).toBeGreaterThanOrEqual(0);
  await options.nth(index).click();
  await expect(page.locator('html')).toHaveAttribute('lang', code);
}

const CASES = [
  { path: '/login?next=%2Fmembers%3Fpage%3D2#draft', kind: 'login', error: 'login.errorEmpty' },
  { path: '/forgot-password?email=draft#draft', kind: 'forgot', error: 'forgot.errEmail' },
  {
    path: '/reset-password?token=local-i18n-audit#draft',
    kind: 'reset',
    error: 'reset.errMismatch',
  },
  { path: '/reset-password#draft', kind: 'missing', error: 'reset.missingToken' },
] as const;

for (const width of [1440, 390]) {
  for (const sample of CASES) {
    test(`D-141 AC824-04/10 public local error ${sample.kind} ${width}; not full native API acceptance`, async ({
      page,
      context,
    }) => {
      const faults: string[] = [],
        writes: string[] = [];
      page.on('pageerror', (error) => faults.push(error.message));
      page.on('console', (entry) => {
        if (entry.type() === 'error') faults.push(entry.text());
      });
      page.on('request', (request) => {
        if (
          new URL(request.url()).pathname.startsWith('/v1/') &&
          !['GET', 'HEAD', 'OPTIONS'].includes(request.method())
        )
          writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
      });
      await context.addCookies([{ name: 'NEXT_LOCALE', value: 'vi', url: ADMIN_URL }]);
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${ADMIN_URL}${sample.path}`);
      await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
      const originalUrl = page.url();
      if (sample.kind === 'login') {
        await page
          .getByPlaceholder(message('vi', 'login.emailPlaceholder'))
          .fill('draft@example.test');
        await page
          .getByRole('button', { name: message('vi', 'login.submit'), exact: true })
          .click();
      } else if (sample.kind === 'forgot') {
        await page.getByRole('textbox').fill('invalid-draft');
        await page
          .getByRole('button', { name: message('vi', 'forgot.submit'), exact: true })
          .click();
      } else if (sample.kind === 'reset') {
        await page
          .getByPlaceholder(message('vi', 'reset.newPasswordPlaceholder'))
          .fill('NewPassword1');
        await page.getByPlaceholder(message('vi', 'reset.confirmPlaceholder')).fill('Different2');
        await page
          .getByRole('button', { name: message('vi', 'reset.submit'), exact: true })
          .click();
      }
      await expect(page.getByText(message('vi', sample.error), { exact: true })).toBeVisible();
      for (const locale of ['en', 'vi'] as const) {
        await select(page, locale);
        await expect(page).toHaveURL(originalUrl);
        const titleKey =
          sample.kind === 'login'
            ? 'login.tabLogin'
            : sample.kind === 'forgot'
              ? 'forgot.title'
              : 'reset.title';
        await expect(page).toHaveTitle(`${message(locale, titleKey)} · OPC Hub Admin`);
        await expect(page.getByText(message(locale, sample.error), { exact: true })).toBeVisible();
        if (sample.kind === 'login')
          await expect(
            page.getByPlaceholder(message(locale, 'login.emailPlaceholder')),
          ).toHaveValue('draft@example.test');
        else if (sample.kind === 'forgot')
          await expect(page.getByRole('textbox')).toHaveValue('invalid-draft');
        else if (sample.kind === 'reset') {
          await expect(
            page.getByPlaceholder(message(locale, 'reset.newPasswordPlaceholder')),
          ).toHaveValue('NewPassword1');
          await expect(
            page.getByPlaceholder(message(locale, 'reset.confirmPlaceholder')),
          ).toHaveValue('Different2');
        }
        const cookie = (await context.cookies(ADMIN_URL)).find(
          (entry) => entry.name === 'NEXT_LOCALE',
        );
        expect(cookie?.value).toBe(locale);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
          width,
        );
      }
      expect(writes).toEqual([]);
      expect(faults).toEqual([]);
    });
  }
}
