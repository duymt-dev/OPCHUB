import { expect, openLocalized, type Page } from './fixtures';
import type { ControlLabels, ControlLocale } from './control-labels';

export async function editorControl(
  page: Page,
  locale: ControlLocale,
  labels: ControlLabels,
  width: number,
) {
  await openLocalized(page, '/events?i18n=editor-control#retained', locale);
  const create = page.getByRole('button', {
    name: `+ ${labels.events.toolbar.create}`,
    exact: true,
  });
  await create.click();
  const panel = page.getByRole('dialog', { name: labels.events.form.createTitle, exact: true });
  await expect(panel).toBeVisible();
  const toolbar = panel.getByRole('toolbar');
  await expect(toolbar).toBeVisible();
  for (const key of [
    'undo',
    'redo',
    'heading',
    'paragraph',
    'bold',
    'italic',
    'underline',
    'strike',
    'bulletListTitle',
    'orderedListTitle',
    'quote',
    'linkTitle',
    'clear',
  ] as const)
    await expect(toolbar.getByTitle(labels.ui.editor[key], { exact: true })).toBeVisible();
  const editor = panel.getByRole('textbox', { name: labels.events.form.desc, exact: true });
  await editor.fill('TIP824 raw nội dung riêng 1234');
  const link = toolbar.getByTitle(labels.ui.editor.linkTitle, { exact: true });
  await link.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: labels.ui.editor.linkTitle, exact: true });
  await expect(dialog).toBeVisible();
  const url = dialog.getByRole('textbox', { name: labels.ui.editor.linkUrl, exact: true });
  await expect(url).toBeFocused();
  await expect(dialog.getByRole('button', { name: labels.ui.close, exact: true })).toBeVisible();
  await url.fill('not-a-valid-url');
  await url.press('Enter');
  await expect(dialog.getByRole('alert')).toHaveText(labels.ui.editor.linkInvalid);
  await expect(url).toHaveAttribute('aria-invalid', 'true');
  const rect = await dialog.evaluate((e) => {
    const r = e.getBoundingClientRect();
    return { left: r.left, right: r.right };
  });
  expect(rect.left).toBeGreaterThanOrEqual(0);
  expect(rect.right).toBeLessThanOrEqual(width);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(editor).toContainText('TIP824 raw nội dung riêng 1234');
  await panel.getByRole('button', { name: labels.events.form.close, exact: true }).first().click();
  await expect(panel).toBeHidden();
  expect(new URL(page.url()).search).toBe('?i18n=editor-control');
  expect(new URL(page.url()).hash).toBe('#retained');
}
