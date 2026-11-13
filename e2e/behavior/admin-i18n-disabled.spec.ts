import { adminLoginResponseSchema } from '@opchub/shared/api';
import { languageOptions } from '@opchub/shared/fixtures';
import { test, expect } from './admin-i18n-disabled/fixtures';
import { disabled, fingerprint, languages, restore } from './admin-i18n-disabled/api';
import { openEnglish } from './admin-i18n/fixtures';
import { selectLocale, assertViewport } from './admin-i18n/navigation';
import { waitApi } from './admin-i18n-values/api';

for (const width of [1440, 390]) {
  test(`D-141 AC824-13 saved-disabled selector/F5 and exact restoration ${width}`, async ({
    page,
    audit,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const login = waitApi(page, 'auth/login');
    await openEnglish(page, '/profile?i18n=disabled#selector');
    const session = adminLoginResponseSchema.parse(await (await login).json());
    expect(session.admin.isSuperAdmin).toBe(true);
    const original = await languages(page, session.accessToken);
    const code = original.defaultLocale === 'my' ? 'en' : 'my';
    expect(original.items.find((i) => i.code === code)?.enabled).toBe(true);
    const changed = disabled(original, code);
    const choice = languageOptions.find((i) => i.code === code);
    if (!choice) throw new Error('Fixed selector identity prerequisite absent');
    try {
      audit.expectToggle(code, false);
      expect(await languages(page, session.accessToken, { code, enabled: false })).toEqual(changed);
      expect(await languages(page, session.accessToken)).toEqual(changed);
      for (const locale of [code, 'vi', code]) {
        await selectLocale(page, locale);
        expect(await languages(page, session.accessToken)).toEqual(changed);
        expect(audit.count(), 'Switch alone cannot PATCH settings').toBe(1);
        await assertViewport(page);
      }
      await page.reload({ waitUntil: 'networkidle' });
      await expect(page.locator('html')).toHaveAttribute('lang', code);
      await expect(page).toHaveURL(/\/profile\?i18n=disabled#selector$/);
      expect((await page.context().cookies()).find((c) => c.name === 'NEXT_LOCALE')?.value).toBe(
        code,
      );
      const trigger = page.locator('button[aria-haspopup="listbox"]');
      await expect(trigger).toContainText(choice.country);
      await trigger.click();
      const list = page.getByRole('listbox');
      await expect(list.getByRole('option')).toHaveCount(12);
      await expect(list.getByRole('option').filter({ hasText: choice.country })).toBeVisible();
      await trigger.click();
      expect(audit.count(), 'F5/selector cannot PATCH settings').toBe(1);
      await audit.settle();
      await assertViewport(page);
    } finally {
      const receipt = await restore(page, session.accessToken, original, changed, code, audit);
      process.stdout.write(
        `Language restoration receipt: ${JSON.stringify({ width, code, original, receipt, mutations: audit.count() })}\n`,
      );
      await test.step(`Exact original restored: ${receipt.before} = ${receipt.after}; alreadyOriginal=${receipt.alreadyOriginal}`, async () => {
        await test.info().attach('language-restoration-no-credentials', {
          body: JSON.stringify({ code, original, receipt }),
          contentType: 'application/json',
        });
      });
    }
    expect(fingerprint(await languages(page, session.accessToken))).toBe(fingerprint(original));
  });
}
