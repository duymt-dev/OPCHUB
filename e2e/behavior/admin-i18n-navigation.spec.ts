import { test, expect, openEnglish } from './admin-i18n/fixtures';
import { selectLocale, assertViewport } from './admin-i18n/navigation';
import { englishChrome } from './admin-i18n/chrome';
import commonEn from '../../apps/admin/messages/en/common.json' with { type: 'json' };
import commonVi from '../../apps/admin/messages/vi/common.json' with { type: 'json' };
import commonMs from '../../apps/admin/messages/ms/common.json' with { type: 'json' };
import uiEn from '../../apps/admin/messages/en/ui.json' with { type: 'json' };
import uiVi from '../../apps/admin/messages/vi/ui.json' with { type: 'json' };
import membersEn from '../../apps/admin/messages/en/members.json' with { type: 'json' };
import membersVi from '../../apps/admin/messages/vi/members.json' with { type: 'json' };
import groupsEn from '../../apps/admin/messages/en/groups.json' with { type: 'json' };
import groupsVi from '../../apps/admin/messages/vi/groups.json' with { type: 'json' };
import settingsEn from '../../apps/admin/messages/en/settings/core.json' with { type: 'json' };
import settingsVi from '../../apps/admin/messages/vi/settings/core.json' with { type: 'json' };
import membersTh from '../../apps/admin/messages/th/members.json' with { type: 'json' };
import commonLo from '../../apps/admin/messages/lo/common.json' with { type: 'json' };
import uiLo from '../../apps/admin/messages/lo/ui.json' with { type: 'json' };

for (const width of [1440, 390]) {
  test(`D-141 AC824-01/05 aliases retain country identity and profile draft after refresh ${width}`, async ({
    page,
    guard,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openEnglish(page, '/profile?alias=identity#alias-draft');
    await page.getByLabel(commonEn.adminProfile.name, { exact: true }).fill('Alias unsaved draft');
    for (const [locale, common] of [
      ['en-SG', commonEn],
      ['ms-BN', commonMs],
      ['en', commonEn],
      ['vi', commonVi],
    ] as const) {
      await selectLocale(page, locale);
      await expect(page).toHaveTitle(`${common.adminProfile.title} · OPC Hub Admin`);
      await expect(page.getByLabel(common.adminProfile.name, { exact: true })).toHaveValue(
        'Alias unsaved draft',
      );
      await guard.settle();
      await assertViewport(page);
    }
  });

  test(`D-141 AC824-05 member URL filters page and protected data survive real locale switches ${width}`, async ({
    page,
    guard,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const path = '/members?view=list&st=active&page=2&size=1#i18n-member-state';
    await openEnglish(page, path);
    const rows = page.locator('[data-m="tbl"] button:has(b)');
    await expect(rows).toHaveCount(1);
    const identity = await rows.first().textContent();
    expect(identity?.trim()).toBeTruthy();
    for (const [locale, messages, title] of [
      ['vi', membersVi, 'Thành viên'],
      ['en', membersEn, 'Members'],
      ['th', membersTh, 'สมาชิก'],
      ['vi', membersVi, 'Thành viên'],
    ] as const) {
      await selectLocale(page, locale);
      await expect(page).toHaveTitle(`${title} · OPC Hub Admin`);
      await expect(
        page.getByRole('combobox', { name: messages.filters.st.label, exact: true }),
      ).toHaveValue('active');
      await expect(
        page.getByRole('combobox', { name: messages.pager.pageSize, exact: true }),
      ).toHaveValue('1');
      await expect(rows).toHaveCount(1);
      await expect(rows.first()).toHaveText(identity ?? '');
      await expect(
        page.getByRole('button', { name: messages.pager.prev, exact: true }),
      ).toBeEnabled();
      await guard.settle();
      await assertViewport(page);
    }
    // A fresh protected read after refresh must still show the same second-page identity.
    await page.reload({ waitUntil: 'networkidle' });
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toHaveText(identity ?? '');
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    await expect(page).toHaveURL(new RegExp('page=2&size=1#i18n-member-state$'));
  });

  test(`D-141 AC824-10 profile draft and local password errors switch without submitting ${width}`, async ({
    page,
    guard,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openEnglish(page, '/profile?i18n=draft#profile-draft');
    const email = await page.getByLabel(commonEn.adminProfile.email, { exact: true }).inputValue();
    await page.getByLabel(commonEn.adminProfile.name, { exact: true }).fill('I18n unsaved draft');
    await page.getByLabel(commonEn.adminProfile.phone, { exact: true }).fill('0909876543');
    await page
      .getByLabel(commonEn.adminProfile.currentPassword, { exact: true })
      .fill('Admin@2026');
    await page.getByLabel(commonEn.adminProfile.newPassword, { exact: true }).fill('weak');
    await page.getByLabel(commonEn.adminProfile.confirmPassword, { exact: true }).fill('weak');
    await page
      .getByRole('button', { name: commonEn.adminProfile.changePassword, exact: true })
      .click();
    await expect(page.getByText(uiEn.errors.adminPasswordRule, { exact: true })).toBeVisible();
    for (const [locale, common, ui] of [
      ['vi', commonVi, uiVi],
      ['en', commonEn, uiEn],
      ['lo', commonLo, uiLo],
      ['vi', commonVi, uiVi],
    ] as const) {
      await selectLocale(page, locale);
      const labels = common.adminProfile;
      await expect(page).toHaveTitle(`${labels.title} · OPC Hub Admin`);
      await expect(page.getByLabel(labels.name, { exact: true })).toHaveValue('I18n unsaved draft');
      await expect(page.getByLabel(labels.phone, { exact: true })).toHaveValue('0909876543');
      await expect(page.getByLabel(labels.email, { exact: true })).toHaveValue(email);
      await expect(page.getByLabel(labels.email, { exact: true })).toBeDisabled();
      for (const [label, value] of [
        [labels.currentPassword, 'Admin@2026'],
        [labels.newPassword, 'weak'],
        [labels.confirmPassword, 'weak'],
      ] as const)
        await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
      await expect(page.getByText(ui.errors.adminPasswordRule, { exact: true })).toBeVisible();
      await guard.settle();
      if (locale === 'en') await englishChrome(page, guard);
      await assertViewport(page);
    }
  });

  test(`D-141 AC824-10/11 provider refresh probe preserves open group drawer and canonical draft ${width}`, async ({
    page,
    guard,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openEnglish(page, '/groups?tab=list#group-draft');
    await page.getByRole('button', { name: '+ Create group', exact: true }).click();
    let panel = page.getByRole('dialog', { name: groupsEn.form.createTitle, exact: true });
    await expect(panel).toBeVisible();
    await panel.getByLabel(groupsEn.form.name).fill('I18n unsaved group');
    await panel.getByLabel(groupsEn.form.province).selectOption({ label: 'Hà Nội' });
    await panel
      .getByRole('textbox', { name: groupsEn.form.desc, exact: true })
      .fill('Raw Vietnamese nội dung không dịch');
    const province = await panel.getByLabel(groupsEn.form.province).inputValue();
    for (const [locale, messages, region] of [
      ['vi', groupsVi, 'Miền Bắc'],
      ['en', groupsEn, uiEn.regions.north],
      ['vi', groupsVi, 'Miền Bắc'],
    ] as const) {
      // Existing full-screen drawer covers the selector. Dispatch actual selector handlers solely
      // to verify RSC/provider refresh state; this is NOT a user-accessibility interaction claim.
      await selectLocale(page, locale, 'covered-handler');
      panel = page.getByRole('dialog', { name: messages.form.createTitle, exact: true });
      await expect(panel).toBeVisible();
      await expect(panel.getByLabel(messages.form.name)).toHaveValue('I18n unsaved group');
      await expect(panel.getByLabel(messages.form.province)).toHaveValue(province);
      await expect(
        panel.getByRole('textbox', { name: messages.form.desc, exact: true }),
      ).toHaveValue('Raw Vietnamese nội dung không dịch');
      await expect(
        panel.getByText(messages.form.region.replace('{region}', region), { exact: true }),
      ).toBeVisible();
      await guard.settle();
      if (locale === 'en') await englishChrome(page, guard);
      await assertViewport(page);
    }
    await panel.getByRole('button', { name: groupsVi.form.close, exact: true }).first().click();
    await expect(panel).toBeHidden();
  });

  test(`D-141 AC824-13 selector cookie and12 options remain independent of saved language settings ${width}`, async ({
    page,
    guard,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openEnglish(page, '/settings?tab=languages#language-settings');
    const initial = await page
      .getByRole('combobox', { name: settingsEn.lang.default, exact: true })
      .inputValue();
    const switches = page.getByRole('switch');
    const enabled = await switches.evaluateAll((elements) =>
      elements.map((e) => e.getAttribute('aria-checked')),
    );
    expect(enabled.length).toBeGreaterThan(0);
    for (const [locale, messages] of [
      ['vi', settingsVi],
      ['en', settingsEn],
      ['vi', settingsVi],
    ] as const) {
      await selectLocale(page, locale);
      await expect(
        page.getByRole('combobox', { name: messages.lang.default, exact: true }),
      ).toHaveValue(initial);
      expect(
        await switches.evaluateAll((elements) =>
          elements.map((e) => e.getAttribute('aria-checked')),
        ),
      ).toEqual(enabled);
      await guard.settle();
      await assertViewport(page);
    }
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    await expect(
      page.getByRole('combobox', { name: settingsVi.lang.default, exact: true }),
    ).toHaveValue(initial);
    await selectLocale(page, 'en');
    await englishChrome(page, guard);
  });
}
