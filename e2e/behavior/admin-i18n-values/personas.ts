import { personaSchema, personaUpsertSchema } from '@opchub/shared/api-domains';
import type { ControlLocale } from '../admin-i18n/control-labels';
import { waitApi } from './api';
import { expect, type Page, type ValuesAudit } from './fixtures';
import { valueLabels } from './labels';
import { PRESETS, type OwnedValues } from './types';
import { sidebarLink } from './navigation';

export async function savePersona(
  page: Page,
  audit: ValuesAudit,
  owned: OwnedValues,
  locale: ControlLocale,
) {
  const t = valueLabels(locale),
    previous = owned.persona;
  audit.mark('persona navigate');
  await audit.settle();
  await sidebarLink(page, '/bots', locale);
  await page.getByRole('tab', { name: t.bots.tabs.persona, exact: true }).click();
  const name = page.getByText(previous.name, { exact: true });
  await expect(name).toBeVisible();
  const card = name.locator('..').locator('..').locator('..');
  await expect(card.getByText(previous.bio, { exact: true })).toBeVisible();
  if (previous.tone.startsWith('tip824'))
    await expect(card.getByText(previous.tone, { exact: true })).toBeVisible();
  if (previous.activeHours.startsWith('tip824'))
    await expect(card.getByText(previous.activeHours, { exact: true })).toBeVisible();
  await card.getByRole('button', { name: t.bots.persona.edit, exact: true }).click();
  const panel = page.getByRole('dialog', { name: t.bots.pf.title, exact: true });
  await expect(panel).toBeVisible();
  await expect(panel.getByLabel(t.bots.pf.name)).toHaveValue(previous.name);
  await expect(panel.locator('textarea')).toHaveValue(previous.bio);
  const tone = t.options.tones[2],
    hours = t.options.hours[4];
  if (!tone || !hours) throw new Error('Expected raw preset label missing');
  await panel.getByLabel(t.bots.pf.tone).selectOption({ label: tone });
  await panel.getByLabel(t.bots.pf.gender).selectOption({ label: t.bots.pf.female });
  await panel.getByLabel(t.bots.pf.hours).selectOption({ label: hours });
  await panel.getByLabel(t.bots.pf.age).selectOption(PRESETS.ageRange);
  const body = { ...personaUpsertSchema.parse(previous), ...PRESETS };
  await expect(panel.getByLabel(t.bots.pf.tone)).toHaveValue(PRESETS.tone);
  await expect(panel.getByLabel(t.bots.pf.gender)).toHaveValue(PRESETS.gender);
  await expect(panel.getByLabel(t.bots.pf.hours)).toHaveValue(PRESETS.activeHours);
  audit.protocol.expectMutation('personas', 'PATCH', body, previous.id);
  const saved = waitApi(page, `personas/${encodeURIComponent(previous.id)}`);
  audit.mark('persona save');
  await panel.getByRole('button', { name: t.bots.pf.save, exact: true }).click();
  const response = await saved;
  expect(response.request().postDataJSON() as unknown).toEqual(body);
  const result = personaSchema.parse(await response.json());
  expect(personaUpsertSchema.parse(result)).toEqual(body);
  expect(result.enabled).toBe(false);
  expect(result.groupIds).toEqual([owned.group.id]);
  await expect(panel).toBeHidden();
  audit.mark('persona after save settle');
  await audit.settle();
  audit.mark('persona reopen');
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.getByText(previous.name, { exact: true })).toBeVisible();
  await card.getByRole('button', { name: t.bots.persona.edit, exact: true }).click();
  await expect(panel.getByLabel(t.bots.pf.tone)).toHaveValue(PRESETS.tone);
  await expect(panel.getByLabel(t.bots.pf.hours)).toHaveValue(PRESETS.activeHours);
  await expect(panel.locator('textarea')).toHaveValue(previous.bio);
  await panel.getByRole('button', { name: t.bots.pf.cancel, exact: true }).click();
  await expect(panel).toBeHidden();
  audit.mark('persona complete');
  owned.persona = result;
}
