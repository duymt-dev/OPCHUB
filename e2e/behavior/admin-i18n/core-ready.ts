import { adminOverviewSchema, generalSettingsSchema } from '@opchub/shared/api-domains';
import { expect, type Page } from './fixtures';
import type { coreScreens, CORE_LOCALES } from './core-labels';

type Screen = ReturnType<typeof coreScreens>[number];
type Locale = (typeof CORE_LOCALES)[number];
const INTL: Record<Locale, string> = {
  vi: 'vi-VN',
  en: 'en-GB',
  'en-SG': 'en-SG',
  zh: 'zh-CN',
  id: 'id-ID',
  th: 'th-TH',
  ms: 'ms-MY',
  'ms-BN': 'ms-BN',
  fil: 'fil-PH',
  km: 'km-KH',
  lo: 'lo-LA',
  my: 'my-MM',
};

/** Register before login/navigation so a fast successful initial response cannot be missed. */
export function coreDataWaiter(page: Page, screen: Screen, locale: Locale) {
  const endpoint = screen.id === 'overview' ? '/admin/overview' : '/admin/settings/general';
  const response =
    screen.id === 'profile'
      ? undefined
      : page.waitForResponse((r) => new URL(r.url()).pathname.endsWith(endpoint) && r.ok());
  void response?.catch(() => undefined); // Retain/rethrow on await; no unhandled pending waiter.
  return async () => {
    if (screen.id === 'overview' && response) {
      const raw: unknown = await (await response).json();
      const { flow } = adminOverviewSchema.parse(raw);
      const count = new Intl.NumberFormat(INTL[locale]); // Independent Node full-ICU oracle.
      await expect(
        page
          .locator('section[aria-labelledby="system-flow-title"] a[href="/fees"]')
          .getByText(`${count.format(flow.paidMembers)} / ${count.format(flow.members)}`, {
            exact: true,
          }),
      ).toBeVisible();
    } else if (screen.id === 'settings' && response) {
      const raw: unknown = await (await response).json();
      const data = generalSettingsSchema.parse(raw);
      await expect(page.getByLabel(screen.field, { exact: true })).toHaveValue(data.platformName);
    } else if (screen.id === 'profile') {
      await expect(page.getByLabel(screen.field, { exact: true })).not.toHaveValue('');
      await expect(page.getByLabel(screen.email, { exact: true })).toHaveValue(
        'admin@opchub.community',
      );
    }
    await expect(page.getByRole('status').filter({ hasText: screen.toast })).toBeHidden();
  };
}
