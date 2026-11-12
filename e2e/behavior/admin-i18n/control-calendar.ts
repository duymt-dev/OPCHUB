import { expect, openLocalized, type Page } from './fixtures';
import type { ControlLabels, ControlLocale } from './control-labels';

export async function calendarControl(
  page: Page,
  locale: ControlLocale,
  labels: ControlLabels,
  width: number,
) {
  const path = '/overview?from=2026-11-20&to=2026-11-30&period=month#calendar-control';
  await openLocalized(page, path, locale);
  const inputs = page.locator('.ant-picker-range .ant-picker-input input');
  await expect(inputs).toHaveCount(2);
  const values = await inputs.evaluateAll((elements) =>
    elements.map((e) => (e as HTMLInputElement).value),
  );
  await inputs.nth(0).click();
  const popup = page.locator('.ant-picker-dropdown').filter({ visible: true });
  await expect(popup).toHaveCount(1);
  for (const preset of Object.values(labels.ui.calendar))
    await expect(popup.getByText(preset, { exact: true })).toBeVisible();
  const next = popup
    .getByRole('button', { name: labels.calendar[0], exact: true })
    .filter({ visible: true });
  const previous = popup
    .getByRole('button', { name: labels.calendar[1], exact: true })
    .filter({ visible: true });
  await expect(next).toHaveCount(1);
  await expect(previous).toHaveCount(1);
  const year = popup.locator('.ant-picker-year-btn').filter({ visible: true }).first();
  await expect(year).toHaveAccessibleName(labels.calendar[2]);
  await expect(year).toHaveText(labels.calendarYear);
  const before = await popup.locator('.ant-picker-header-view').allTextContents();
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(async () =>
    expect(await popup.locator('.ant-picker-header-view').allTextContents()).not.toEqual(before),
  ).toPass();
  await previous.focus();
  await page.keyboard.press('Enter');
  await expect(async () =>
    expect(await popup.locator('.ant-picker-header-view').allTextContents()).toEqual(before),
  ).toPass();
  const rect = await popup.evaluate((e) => {
    const r = e.getBoundingClientRect();
    return { left: r.left, right: r.right, width: r.width };
  });
  expect(rect.left, JSON.stringify(rect)).toBeGreaterThanOrEqual(0);
  expect(rect.right, JSON.stringify(rect)).toBeLessThanOrEqual(width);
  const overflow = await popup
    .locator(
      '.ant-picker-panel-container, .ant-picker-panel-layout, .ant-picker-panels, .ant-picker-panel, .ant-picker-presets',
    )
    .evaluateAll((nodes) =>
      nodes.map((e) => ({
        selector: e.getAttribute('class'),
        client: e.clientWidth,
        scroll: e.scrollWidth,
        left: e.getBoundingClientRect().left,
        right: e.getBoundingClientRect().right,
      })),
    );
  for (const element of overflow) {
    expect(element.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(element.client + 1);
    expect(element.left, JSON.stringify(element)).toBeGreaterThanOrEqual(0);
    expect(element.right, JSON.stringify(element)).toBeLessThanOrEqual(width);
  }
  await page.keyboard.press('Escape');
  await expect(popup).toHaveCount(0);
  expect(
    await inputs.evaluateAll((elements) => elements.map((e) => (e as HTMLInputElement).value)),
  ).toEqual(values);
  expect(new URL(page.url()).search).toBe('?from=2026-11-20&to=2026-11-30&period=month');
  expect(new URL(page.url()).hash).toBe('#calendar-control');
}
