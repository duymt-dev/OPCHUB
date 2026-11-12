import { test } from './admin-i18n-auth/fixtures';
import { CORE_LOCALES } from './admin-i18n-auth/labels';
import { provision } from './admin-i18n-auth/provision';
import { firstPassword } from './admin-i18n-auth/first-password';
import { twoFactor } from './admin-i18n-auth/two-factor';

for (const locale of CORE_LOCALES)
  for (const width of [1440, 390])
    test(`D-141 AC824-04/10 actual first-password and 2FA ${locale} ${width}`, async ({
      page,
      audit,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      const account = await provision(page, audit);
      await firstPassword(page, audit, account, locale, width);
      await twoFactor(page, audit, account, locale);
      await audit.settle();
    });
