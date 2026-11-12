import { test, expect } from './admin-i18n/fixtures';
import {
  previewEditor,
  unchangedRoles,
  previewGeometry,
  completeActionLabel,
} from './admin-i18n/preview';
import { selectLocale, assertViewport } from './admin-i18n/navigation';
import { sidebarLink } from './admin-i18n-values/navigation';
import en from '../../apps/admin/messages/en/common.json' with { type: 'json' };
import vi from '../../apps/admin/messages/vi/common.json' with { type: 'json' };
import my from '../../apps/admin/messages/my/common.json' with { type: 'json' };
import enGroups from '../../apps/admin/messages/en/groups.json' with { type: 'json' };
import viGroups from '../../apps/admin/messages/vi/groups.json' with { type: 'json' };
import myGroups from '../../apps/admin/messages/my/groups.json' with { type: 'json' };

const choices = [
  ['en', en, enGroups],
  ['vi', vi, viGroups],
  ['my', my, myGroups],
] as const;

for (const width of [1440, 390]) {
  test(`D-141 AC824-06/11/15 role preview internal forbidden EN/VI/My ${width}`, async ({
    page,
    guard,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const { token, original } = await previewEditor(page);
    for (const [locale, labels] of choices) {
      await selectLocale(page, locale);
      await expect(
        page.getByRole('heading', { name: labels.rbac.forbiddenTitle, exact: true }),
      ).toBeVisible();
      await expect(page.getByText(labels.rbac.forbiddenBody, { exact: true })).toBeVisible();
      await expect(
        page.getByRole('button', { name: labels.rbac.forbiddenBack, exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: labels.rbac.previewExit, exact: true }),
      ).toBeVisible();
      await expect(page).toHaveURL(/\/settings\?tab=roles#preview$/);
      await assertViewport(page);
      await guard.settle();
    }
    await page.getByRole('button', { name: my.rbac.previewExit, exact: true }).click();
    await expect(
      page.getByRole('heading', { name: my.rbac.forbiddenTitle, exact: true }),
    ).toHaveCount(0);
    await unchangedRoles(page, token, original);
  });

  test(`D-141 AC824-11/15 view-only preview blocks translated edit without mutation ${width}`, async ({
    page,
    guard,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const { token, original, editor } = await previewEditor(page);
    await sidebarLink(page, '/groups', 'en');
    await page.getByRole('button', { name: enGroups.list.viewList, exact: true }).click();
    const zone = page.locator('[data-view-only="1"]');
    await expect(zone).toBeVisible();
    for (const [locale, labels, groups] of choices) {
      await selectLocale(page, locale);
      for (const name of [groups.list.edit, groups.list.exportOne, groups.list.delete]) {
        const action = zone.getByRole('button', { name, exact: true }).first();
        await action.click();
        await completeActionLabel(action);
        await expect(
          page
            .getByRole('status')
            .filter({ hasText: labels.rbac.viewOnlyToast.replace('{role}', editor.name) }),
        ).toBeVisible();
        await expect(page.getByRole('dialog')).toHaveCount(0);
      }
      const iconExport = zone.getByRole('button', { name: groups.list.export, exact: true });
      await expect(iconExport).toHaveCount(1);
      await iconExport.locator('svg').click();
      await expect(
        page
          .getByRole('status')
          .filter({ hasText: labels.rbac.viewOnlyToast.replace('{role}', editor.name) }),
      ).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await guard.settle();
      await previewGeometry(page, locale);
      await assertViewport(page);
    }
    await page.getByRole('button', { name: my.rbac.previewExit, exact: true }).click();
    await expect(zone).toHaveCount(0);
    await unchangedRoles(page, token, original);
  });
}
