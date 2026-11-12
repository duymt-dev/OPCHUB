import { fileURLToPath } from 'node:url';
import { env } from '../../env';
import { IMAGE_LOCALES } from '../admin-i18n/core-labels';
import { expect, type Page } from './fixtures';
import { authGeometry } from './geometry';

export async function authImage(
  page: Page,
  locale: string,
  state: 'first-password' | 'mfa',
  width: number,
) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await expect(page.getByRole('status').filter({ visible: true })).toHaveCount(0);
  await authGeometry(page, state);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'Actual auth viewport must not overflow',
  ).toBe(true);
  expect(
    (await page.locator('[data-testid="totp-uri"], [data-testid="totp-secret"]').count()) === 0,
    'Never capture a TOTP setup secret',
  ).toBe(true);
  expect(
    await page
      .locator('input[type="password"]')
      .evaluateAll((nodes) => nodes.every((node) => (node as HTMLInputElement).value === '')),
    'Never capture a populated password field',
  ).toBe(true);
  if (!IMAGE_LOCALES.has(locale)) return;
  if (width !== 1440 && width !== 390) throw new Error('Unexpected auth evidence viewport');
  const mode = env.E2E_TARGET === 'server' ? 'native' : 'msw';
  const path = fileURLToPath(
    new URL(
      `../../../coding-packs/reports/evidence/v46-824/auth-${state}-${locale}-${mode}-${width}.png`,
      import.meta.url,
    ),
  );
  await page.screenshot({ path, fullPage: true, animations: 'disabled', caret: 'hide' });
}
