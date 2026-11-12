import { languageOptions } from '@opchub/shared/fixtures';
import type { Locator } from '@playwright/test';
import { expect, type Page } from './fixtures';

/** Real shared selector: do not set cookies behind the component during a switch. */
export async function selectLocale(
  page: Page,
  code: string,
  interaction: 'pointer' | 'covered-handler' = 'pointer',
): Promise<void> {
  const choice = languageOptions.find((option) => option.code === code);
  if (!choice) throw new Error(`Unknown test locale ${code}`);
  const before = page.url();
  const activate = async (element: Locator) => {
    // Explicit provider-refresh robustness probe only: the existing modal covers the topbar.
    // This exercises the real React handler, NOT proof of pointer/keyboard access behind a modal.
    if (interaction === 'covered-handler') await element.dispatchEvent('click');
    else await element.click();
  };
  await activate(page.locator('button[aria-haspopup="listbox"]'));
  const list = page.getByRole('listbox');
  await expect(list.getByRole('option')).toHaveCount(12);
  const option = list.getByRole('option').filter({ hasText: choice.country });
  await expect(option).toHaveCount(1);
  await activate(option);
  await expect(page.locator('html')).toHaveAttribute('lang', code);
  const trigger = page.locator('button[aria-haspopup="listbox"]');
  await expect(trigger).toContainText(choice.native);
  await expect(trigger.locator('img')).toHaveAttribute('src', choice.flagSrc);
  await expect(page).toHaveURL(before);
  await expect(list).toBeHidden();
  expect(
    (await page.context().cookies()).find((cookie) => cookie.name === 'NEXT_LOCALE')?.value,
  ).toBe(code);
  await page.waitForLoadState('networkidle');
}

export async function assertViewport(page: Page): Promise<void> {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
