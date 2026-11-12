import { selectLocale } from './admin-i18n/navigation';
import { test, expect } from './admin-i18n-values/fixtures';
import { provision, readOwned } from './admin-i18n-values/provision';
import { saveGroup } from './admin-i18n-values/groups';
import { savePersona } from './admin-i18n-values/personas';

test('D-141 AC824-11 canonical owned saves en 1440/390 and my 1440/390', async ({
  page,
  audit,
}) => {
  const { owned, token } = await provision(page, audit);
  for (const locale of ['en', 'my'] as const)
    for (const width of [1440, 390]) {
      await test.step(`${locale} ${width}: actual group/persona save and API readback`, async () => {
        await page.setViewportSize({ width, height: 1000 });
        await selectLocale(page, locale);
        await saveGroup(page, audit, owned, locale, width);
        await savePersona(page, audit, owned, locale);
        await audit.settle();
        audit.mark('fresh owned API readback');
        const persisted = await readOwned(page, token, owned);
        expect(persisted).toEqual(owned);
        audit.mark('substep complete');
      });
    }
});
