import type { ControlLocale } from '../admin-i18n/control-labels';
import { expect, type Page } from './fixtures';
import { valueLabels } from './labels';

export async function sidebarLink(page: Page, href: '/groups' | '/bots', locale: ControlLocale) {
  if ((page.viewportSize()?.width ?? 0) < 768)
    await page.getByRole('button', { name: valueLabels(locale).menu, exact: true }).click();
  const link = page.locator(`a[href="${href}"]`);
  await expect(link).toBeInViewport();
  await link.click();
}
