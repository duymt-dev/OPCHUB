import { ADMIN_URL } from '../urls';
import { CORE_LOCALES } from './admin-i18n/core-labels';
import { selectLocale } from './admin-i18n/navigation';
import { test } from './admin-i18n-password/fixtures';
import { forgotLocal, resetLocal, missingToken } from './admin-i18n-password/flows';

for (const locale of CORE_LOCALES)
  for (const width of [1440, 390]) {
    test(`D-141 AC824-04/10/15 public password local states ${locale} ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${ADMIN_URL}/login`);
      await selectLocale(page, locale);
      await forgotLocal(page, locale);
      await resetLocal(page, locale);
      await missingToken(page, locale);
    });
  }
