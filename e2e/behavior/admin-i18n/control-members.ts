import { adminMemberPageSchema } from '@opchub/shared/api-domains';
import { expect, openLocalized, type Page } from './fixtures';
import { insert, type ControlLabels, type ControlLocale } from './control-labels';

export async function memberControls(page: Page, locale: ControlLocale, labels: ControlLabels) {
  const response = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/admin/users' && r.ok(),
  );
  void response.catch(() => undefined);
  await openLocalized(page, '/members?view=list&page=1&size=1#native-controls', locale);
  const raw = adminMemberPageSchema.parse(await (await response).json());
  expect(raw.total, 'Both API fixtures must contain at least two real members').toBeGreaterThan(1);
  expect(raw.items).toHaveLength(1);
  const first = raw.items[0];
  if (!first) throw new Error('Missing real member precondition');
  const range = insert(labels.ui.pagination.range, {
    from: labels.number(1),
    to: labels.number(1),
    total: labels.number(raw.total),
    unit: labels.members.pager.unit,
  });
  const pager = page.getByRole('navigation', { name: range, exact: true });
  await expect(pager).toBeVisible();
  await expect(pager.locator('button[aria-current=page]')).toHaveText(labels.number(1));
  await expect(
    pager.getByRole('button', { name: labels.members.pager.prev, exact: true }),
  ).toBeDisabled();
  const sizes = pager.getByRole('combobox', { name: labels.members.pager.pageSize, exact: true });
  await expect(sizes).toHaveValue('1');
  await expect(sizes.locator('option[value="1"]')).toHaveText(
    insert(labels.ui.pagination.perPage, { n: labels.number(1) }),
  );
  const checkbox = page.getByRole('checkbox', {
    name: insert(labels.members.col.select, { name: first.fullName }),
    exact: true,
  });
  await checkbox.focus();
  await page.keyboard.press('Space');
  await expect(checkbox).toHaveAttribute('aria-checked', 'true');
  const bulk = page.getByRole('region', { name: labels.ui.bulk.aria, exact: true });
  await expect(bulk.locator('b')).toHaveText(labels.number(1));
  await expect(bulk).toContainText(labels.members.bulk.selected);
  await expect(bulk).toContainText(labels.members.bulk.unit);
  await bulk.getByRole('button', { name: labels.members.bulk.clear, exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(bulk).toBeHidden();
  await expect(checkbox).toHaveAttribute('aria-checked', 'false');
  const nextResponse = page.waitForResponse((r) => {
    const u = new URL(r.url());
    return u.pathname === '/v1/admin/users' && u.searchParams.get('page') === '2' && r.ok();
  });
  void nextResponse.catch(() => undefined);
  await pager.getByRole('button', { name: labels.members.pager.next, exact: true }).focus();
  await page.keyboard.press('Enter');
  const second = adminMemberPageSchema.parse(await (await nextResponse).json());
  expect(second.items).toHaveLength(1);
  expect(new URL(page.url()).searchParams.get('page')).toBe('2');
  expect(new URL(page.url()).searchParams.get('size')).toBe('1');
  const secondRange = insert(labels.ui.pagination.range, {
    from: labels.number(2),
    to: labels.number(2),
    total: labels.number(raw.total),
    unit: labels.members.pager.unit,
  });
  await expect(
    page
      .getByRole('navigation', { name: secondRange, exact: true })
      .locator('button[aria-current=page]'),
  ).toHaveText(labels.number(2));
}
