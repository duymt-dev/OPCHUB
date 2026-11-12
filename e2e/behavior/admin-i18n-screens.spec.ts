import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../env';
import { test, expect, openEnglish, openLocalized } from './admin-i18n/fixtures';
import { englishChrome, EXPORT_PREVIEW_HEADERS } from './admin-i18n/chrome';
import { SCREENS, SETTINGS, SELECTED_TAB } from './admin-i18n/screen-cases';
import { DIALOGS } from './admin-i18n/dialogs';

const evidence = fileURLToPath(
  new URL('../../coding-packs/reports/evidence/v46-824', import.meta.url),
);

test('D-141 AC824-15 Vietnamese bot tabs retain mobile navigation without horizontal overflow', async ({
  page,
  guard,
}) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await openLocalized(page, '/bots/personas', 'vi');
  for (const name of [
    'Persona',
    'Kịch bản hội thoại',
    'Hội thoại',
    'Nhật ký tự động',
    'Trả lời từng tin',
  ]) {
    const tab = page.getByRole('tab', { name, exact: true });
    await expect(tab).toBeVisible();
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('tabpanel').filter({ visible: true }).locator('[aria-busy="true"]'),
    ).toHaveCount(0);
    await guard.settle();
    const layout = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      viewport: innerWidth,
      over: [...document.querySelectorAll('body *')]
        .filter((element) => element.getBoundingClientRect().right > innerWidth + 1)
        .slice(0, 12)
        .map((element) => ({
          tag: element.tagName,
          class: element.className,
          right: element.getBoundingClientRect().right,
        })),
    }));
    expect(layout.scroll, JSON.stringify({ tab: name, ...layout })).toBeLessThanOrEqual(
      layout.viewport,
    );
  }
});

test('D-141 AC824-06 chrome scan rejects injected text/aria/placeholder and raw-name prefixes', async ({
  page,
  guard,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openEnglish(page, '/overview');
  await englishChrome(page, guard);
  for (const kind of ['text', 'aria-label', 'placeholder']) {
    await page.evaluate((attribute) => {
      const element = document.createElement(attribute === 'placeholder' ? 'input' : 'button');
      element.setAttribute('data-i18n-negative-fixture', '1');
      if (attribute === 'text') element.textContent = 'Sửa Nguyễn Văn A';
      else element.setAttribute(attribute, 'Nhãn chưa được dịch');
      document.body.appendChild(element);
    }, kind);
    try {
      await expect(englishChrome(page, guard)).rejects.toThrow('Vietnamese chrome');
    } finally {
      await page.locator('[data-i18n-negative-fixture]').evaluate((element) => element.remove());
    }
  }
  await englishChrome(page, guard);
});

for (const dialog of DIALOGS) {
  for (const width of [1440, 390]) {
    test(`D-141 AC824-06/15 English dialog ${dialog.id} ${width}`, async ({ page, guard }) => {
      await page.setViewportSize({ width, height: 1000 });
      await openEnglish(page, dialog.path);
      const trigger =
        dialog.button !== undefined
          ? page.getByRole('button', { name: dialog.button, exact: true }).first()
          : page.locator(dialog.selector).first();
      await expect(trigger).toBeVisible();
      await trigger.click();
      const panel = page.getByRole('dialog', { name: dialog.name, exact: true });
      await expect(panel).toBeVisible();
      for (const text of dialog.labels) {
        // Required stars and native select options belong to the accessible field name.
        const fieldOrCaption = panel.getByLabel(text).or(panel.getByText(text));
        await expect(fieldOrCaption.filter({ visible: true }).first()).toBeVisible();
      }
      await page.waitForLoadState('networkidle');
      if (dialog.id === 'ai-call-log') {
        await panel.getByRole('combobox', { name: 'Log provider', exact: true }).click();
        const custom = page.getByRole('option', {
          name: 'Custom (OpenAI-compatible)',
          exact: true,
        });
        await expect(custom).toBeVisible();
        const filtered = page.waitForResponse((response) => {
          const url = new URL(response.url());
          return (
            url.pathname === '/v1/admin/settings/ai/calls' &&
            url.searchParams.get('provider') === 'custom'
          );
        });
        await custom.click();
        expect((await filtered).status()).toBe(200);
        await expect(panel.getByTitle('Custom (OpenAI-compatible)', { exact: true })).toBeVisible();
      }
      const preview = dialog.id === 'group-export-options' ? panel.getByRole('table') : undefined;
      if (preview)
        await expect(preview.getByRole('columnheader')).toHaveText(EXPORT_PREVIEW_HEADERS);
      await englishChrome(page, guard, preview);
      const bounds = await panel.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return { left: box.left, right: box.right, viewport: innerWidth };
      });
      expect(bounds.left, JSON.stringify(bounds)).toBeGreaterThanOrEqual(-1);
      expect(bounds.right, JSON.stringify(bounds)).toBeLessThanOrEqual(bounds.viewport + 1);
      const horizontal = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        viewport: innerWidth,
        over: [...document.querySelectorAll('body *')]
          .filter((element) => element.getBoundingClientRect().right > innerWidth + 1)
          .slice(0, 12)
          .map((element) => ({
            tag: element.tagName,
            class: element.className,
            right: element.getBoundingClientRect().right,
          })),
      }));
      expect(horizontal.scroll, JSON.stringify(horizontal)).toBeLessThanOrEqual(
        horizontal.viewport,
      );
      const close = panel
        .getByRole('button', { name: dialog.close ?? 'Close', exact: true })
        .first();
      await expect(close).toBeVisible();
      await close.click();
      await expect(panel).toBeHidden();
    });
  }
}
for (const screen of SCREENS) {
  const widths = screen.capture ? [1440, 390] : [1440];
  for (const width of widths) {
    test(`D-141 AC824-06/15 English loaded ${screen.id} ${width}`, async ({ page, guard }) => {
      await page.setViewportSize({ width, height: 1000 });
      await openEnglish(page, screen.path);
      await expect(page).toHaveTitle(`${screen.title} · OPC Hub Admin`);
      await expect(
        page.getByRole('heading', { name: screen.heading, level: 1, exact: true }),
      ).toBeVisible();
      for (const text of screen.anchors)
        await expect(page.getByText(text, { exact: true }).first()).toBeVisible();
      const selected = SELECTED_TAB[screen.id];
      if (selected)
        await expect(
          page.getByRole('tab', { selected: true }).filter({ hasText: selected }),
        ).toBeVisible();
      await englishChrome(page, guard);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (screen.capture) {
        await expect(
          page.getByRole('status').filter({ hasText: 'Sign in to the Admin Dashboard' }),
        ).toBeHidden();
        await page.evaluate(() => document.fonts.ready);
        mkdirSync(evidence, { recursive: true });
        await page.screenshot({
          path: resolve(evidence, `en-${screen.capture}-${env.E2E_TARGET}-${width}.png`),
          fullPage: true,
          animations: 'disabled',
        });
      }
    });
  }
}

test('D-141 AC824-06 all14 English settings tabs are navigable and display their own bodies', async ({
  page,
  guard,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openEnglish(page, '/settings');
  await expect(page).toHaveTitle('Settings & Permissions · OPC Hub Admin');
  const nav = page.getByRole('navigation', { name: 'Settings sections', exact: true });
  for (const [tab, label, heading] of SETTINGS) {
    const button = nav.getByRole('button').filter({ hasText: label }).first();
    await button.click();
    await expect(button).toHaveAttribute('aria-current', 'page');
    expect(new URL(page.url()).searchParams.get('tab') ?? 'general').toBe(tab);
    await expect(
      page
        .locator('[data-screen-label="Admin · Settings & Permissions"] > div')
        .getByText(heading, { exact: true })
        .first(),
    ).toBeVisible();
    await page.waitForLoadState('networkidle');
    await englishChrome(page, guard);
  }
});

for (const width of [1440, 390]) {
  test(`D-141 AC824-06/15 English settings general ${width}`, async ({ page, guard }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openEnglish(page, '/settings');
    await expect(page).toHaveTitle('Settings & Permissions · OPC Hub Admin');
    await expect(page.getByRole('heading', { name: 'System settings', level: 1 })).toBeVisible();
    await expect(page.getByLabel('Platform name', { exact: true })).toHaveValue(/OPC/);
    await expect(page.getByLabel('Contact email', { exact: true })).toBeVisible();
    await englishChrome(page, guard);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    mkdirSync(evidence, { recursive: true });
    await expect(
      page.getByRole('status').filter({ hasText: 'Sign in to the Admin Dashboard' }),
    ).toBeHidden();
    await page.screenshot({
      path: resolve(evidence, `en-settings-${env.E2E_TARGET}-${width}.png`),
      fullPage: true,
      animations: 'disabled',
    });
  });
}
