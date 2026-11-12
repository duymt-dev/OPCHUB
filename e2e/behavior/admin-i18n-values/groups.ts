import { groupAdminUpsertSchema, groupDetailSchema } from '@opchub/shared/api-domains';
import type { ControlLocale } from '../admin-i18n/control-labels';
import { waitApi } from './api';
import { expect, type Page, type ValuesAudit } from './fixtures';
import { valueLabels } from './labels';
import type { OwnedValues } from './types';
import { sidebarLink } from './navigation';

export async function saveGroup(
  page: Page,
  audit: ValuesAudit,
  owned: OwnedValues,
  locale: ControlLocale,
  width: number,
) {
  const t = valueLabels(locale),
    previous = owned.group;
  const province = width === 1440 ? 'Đà Nẵng' : 'Hà Nội';
  const region = width === 1440 ? 'Miền Trung' : 'Miền Bắc';
  const label = width === 1440 ? t.regions.central : t.regions.north;
  await audit.settle();
  await sidebarLink(page, '/groups', locale);
  await page.getByPlaceholder(t.groups.list.search).fill(previous.name);
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(previous.name);
  await page.getByRole('button', { name: t.groups.list.viewList, exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('view')).toBe('list');
  await expect(page.getByText(previous.name, { exact: true }).and(page.locator('b'))).toBeVisible();
  const edit = page.getByRole('button', { name: t.groups.list.edit, exact: true });
  await expect(edit).toHaveCount(1);
  await edit.click();
  const panel = page.getByRole('dialog', { name: t.groups.form.editTitle, exact: true });
  await expect(panel).toBeVisible();
  await expect(panel.getByLabel(t.groups.form.name)).toHaveValue(previous.name);
  await expect(panel.getByLabel(t.groups.form.province)).toHaveValue(previous.province);
  await panel.getByLabel(t.groups.form.province).selectOption({ label: province });
  await expect(
    panel.getByText(t.groups.form.region.replace('{region}', label), { exact: true }),
  ).toBeVisible();
  // Existing industry naming behavior regenerates the suggested name after province changes.
  // Restore this fixture's explicit custom name, never save the suggested unowned name.
  await panel.getByLabel(t.groups.form.name).fill(previous.name);
  const body = { ...groupAdminUpsertSchema.parse(previous), province };
  audit.protocol.expectMutation('groups', 'PATCH', body, previous.id);
  const saved = waitApi(page, `groups/${encodeURIComponent(previous.id)}`);
  await panel.getByRole('button', { name: t.groups.form.save, exact: true }).click();
  const response = await saved;
  expect(response.request().postDataJSON() as unknown).toEqual(body);
  const result = groupDetailSchema.parse(await response.json());
  expect(result.region).toBe(region);
  expect(result.province).toBe(province);
  expect(groupAdminUpsertSchema.parse(result)).toEqual(body);
  await expect(panel).toBeHidden();
  await audit.settle();
  await expect(page.getByText(`${province} · ${label}`, { exact: true })).toBeVisible();
  const filter = page.getByRole('group', { name: t.groups.list.regionLabel, exact: true });
  await filter.getByRole('button').filter({ hasText: label }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('region')).toBe(region);
  await expect(page.getByText(previous.name, { exact: true }).and(page.locator('b'))).toBeVisible();
  await audit.settle();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.getByText(previous.name, { exact: true }).and(page.locator('b'))).toBeVisible();
  expect(new URL(page.url()).searchParams.get('region')).toBe(region);
  await page.getByRole('button', { name: t.groups.list.edit, exact: true }).click();
  await expect(panel.getByLabel(t.groups.form.province)).toHaveValue(province);
  await expect(panel.getByLabel(t.groups.form.name)).toHaveValue(previous.name);
  await panel.getByRole('button', { name: t.groups.form.close, exact: true }).click();
  await expect(panel).toBeHidden();
  owned.group = result;
}
