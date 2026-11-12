import { fileURLToPath } from 'node:url';
import { env } from '../../env';
import { expect, type Page } from './fixtures';
import type { ControlLocale } from '../admin-i18n/control-labels';
import { passwordLabels } from './labels';

export async function passwordImage(page: Page, locale: ControlLocale, state: 'forgot' | 'reset') {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  const title = passwordLabels(locale)[state].title;
  const panel = page
    .getByRole('heading', { level: 1, name: title, exact: true })
    .locator('..')
    .locator('..');
  // Ordinary document scrolling, centered to avoid nearest-edge subpixel clipping.
  await panel.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await expect(panel).toBeInViewport({ ratio: 1 });
  const buttons = await panel.getByRole('button').evaluateAll((nodes) =>
    nodes.map((node, index) => {
      const box = node.getBoundingClientRect(),
        range = document.createRange();
      range.selectNodeContents(node);
      return {
        index,
        box: { left: box.left, right: box.right, top: box.top, bottom: box.bottom },
        text: [...range.getClientRects()].map((r) => ({
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
        })),
      };
    }),
  );
  expect(buttons.length).toBeGreaterThan(0);
  for (const button of buttons)
    for (const rect of button.text) {
      const receipt = JSON.stringify(button);
      expect(rect.left, receipt).toBeGreaterThanOrEqual(button.box.left - 1);
      expect(rect.right, receipt).toBeLessThanOrEqual(button.box.right + 1);
      expect(rect.top, receipt).toBeGreaterThanOrEqual(button.box.top - 1);
      expect(rect.bottom, receipt).toBeLessThanOrEqual(button.box.bottom + 1);
    }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await page
      .locator('input')
      .evaluateAll((nodes) => nodes.every((node) => (node as HTMLInputElement).value === '')),
  ).toBe(true);
  if (!['vi', 'my'].includes(locale) || page.viewportSize()?.width !== 390) return;
  const mode = env.E2E_TARGET === 'server' ? 'native' : 'msw';
  const path = fileURLToPath(
    new URL(
      `../../../coding-packs/reports/evidence/v46-824/password-${state}-${locale}-${mode}-390.png`,
      import.meta.url,
    ),
  );
  await page.screenshot({ path, fullPage: true, animations: 'disabled', caret: 'hide' });
}
