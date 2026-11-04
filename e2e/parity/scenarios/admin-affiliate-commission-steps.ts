import { expect } from '@playwright/test';
import { resetScroll, tick } from '../steps';
import type { StepCtx } from '../types';
import { openAffiliate } from './admin-affiliate-steps';

export const COMMISSION_FILTERS = [
  { key: 'recorded', label: 'Đã ghi nhận', total: 19 },
  { key: 'paid', label: 'Đã chi trả', total: 31 },
  { key: 'cancelled', label: 'Đã hủy', total: 1 },
] as const;

export function commissionRows(c: StepCtx) {
  return c.side === 'app'
    ? c.page.locator('tbody tr[data-row-key]')
    : c.page.locator('[data-m="tbl"] div[style*="min-height: 52px"]').filter({ visible: true });
}

export async function filterCommissions(c: StepCtx, filter: (typeof COMMISSION_FILTERS)[number]) {
  await openAffiliate(c);
  await expect(commissionRows(c).first()).toBeVisible();
  if (c.side === 'app') {
    const radio = c.page.getByRole('radio', {
      name: new RegExp(`^${filter.label}\\s*${filter.key === 'recorded' ? 21 : filter.total}$`),
    });
    await c.page.locator('label').filter({ has: radio }).click();
    await expect(radio).toBeChecked();
    await expect(c.page).toHaveURL(new RegExp(`[?&]status=${filter.key}(?:&|$)`));
  } else {
    const toolbar = c.page.getByPlaceholder('Tìm thành viên hoặc affiliate...').locator('..');
    const control = toolbar
      .locator(':scope > div')
      .first()
      .locator(':scope > div')
      .filter({ hasText: new RegExp(`^${filter.label}\\s*${filter.total}$`) });
    await expect(control).toHaveCount(1);
    await control.click();
    await expect(control).toHaveCSS('background-color', 'rgb(22, 119, 255)');
  }
  await tick(c, 1000);
  await c.page.waitForLoadState('networkidle');
  // A query response can schedule another Segmented RAF after the first clock advance.
  await tick(c, 1000);
  if (c.side === 'app') {
    const selected = c.page
      .locator('.ant-segmented label')
      .filter({ has: c.page.getByRole('radio', { checked: true }) });
    await expect(selected).toHaveCount(1);
    await expect(selected).toHaveCSS('background-color', 'rgb(22, 119, 255)');
  }
  const rows = commissionRows(c);
  await expect(rows).toHaveCount(Math.min(filter.total, 10));
  for (const row of await rows.all())
    await expect(row.getByText(filter.label, { exact: true })).toBeVisible();
  await resetScroll(c);
}

export async function openCommissionMenu(c: StepCtx) {
  const row = commissionRows(c).first();
  await expect(row).toBeVisible();
  await row.scrollIntoViewIfNeeded();
  if (c.side === 'app') {
    const menu = c.page.getByRole('menu');
    if (!(await menu.isVisible()))
      await row.getByRole('button', { name: 'Chuyển trạng thái', exact: true }).click();
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem')).toHaveCount(3);
  } else {
    await row.locator(':scope > div').last().locator(':scope > div').first().hover();
    await expect(row.getByText('Chuyển trạng thái', { exact: true })).toBeVisible();
  }
  // AntD's appear preparation uses requestAnimationFrame on the paused parity clock.
  await tick(c, 1000);
  if (c.side === 'app') {
    const menu = c.page.getByRole('menu');
    await expect(menu).toBeInViewport();
    await expect(menu.locator('..')).toHaveCSS('opacity', '1');
  }
  // This helper also runs after settle: a pre-settle assertion cannot certify the captured state.
  await expect(
    c.side === 'app'
      ? c.page.getByRole('menu')
      : row.getByText('Chuyển trạng thái', { exact: true }),
  ).toBeVisible();
}
