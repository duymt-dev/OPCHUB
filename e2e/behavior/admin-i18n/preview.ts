import { adminRoleListSchema } from '@opchub/shared/api-domains';
import { adminLoginResponseSchema } from '@opchub/shared/api';
import { expect, openEnglish, type Page } from './fixtures';
import { waitApi, browserApi } from '../admin-i18n-values/api';
import access from '../../../apps/admin/messages/en/settings/access.json' with { type: 'json' };
import type { Locator } from '@playwright/test';

export async function previewEditor(page: Page) {
  const login = waitApi(page, 'auth/login');
  await openEnglish(page, '/settings?tab=roles#preview');
  const session = adminLoginResponseSchema.parse(await (await login).json());
  const result = await browserApi(page, session.accessToken, 'admin-roles');
  expect(result.status).toBe(200);
  const original = adminRoleListSchema.parse(result.body);
  const editor = original.items.find((r) => r.key === 'editor');
  if (!editor) throw new Error('Existing editor role prerequisite absent');
  expect(editor.permissions).toContain('groups.view');
  expect(editor.permissions.some((k) => k.startsWith('settings.'))).toBe(false);
  await page
    .getByRole('combobox', { name: access.roles.previewTitle, exact: true })
    .selectOption(editor.id);
  return { token: session.accessToken, original, editor };
}

export async function unchangedRoles(page: Page, token: string, original: unknown) {
  const result = await browserApi(page, token, 'admin-roles');
  expect(result.status).toBe(200);
  expect(adminRoleListSchema.parse(result.body)).toEqual(original);
}

export async function completeActionLabel(button: Locator) {
  await expect(button).toBeInViewport({ ratio: 1 });
  const bounds = await button.evaluate((e) => {
    const range = document.createRange();
    range.selectNodeContents(e);
    const b = e.getBoundingClientRect(),
      text = range.getBoundingClientRect();
    return {
      left: b.left,
      right: b.right,
      top: b.top,
      bottom: b.bottom,
      textLeft: text.left,
      textRight: text.right,
      textTop: text.top,
      textBottom: text.bottom,
    };
  });
  expect(bounds.textLeft, JSON.stringify(bounds)).toBeGreaterThanOrEqual(bounds.left);
  expect(bounds.textRight, JSON.stringify(bounds)).toBeLessThanOrEqual(bounds.right);
  expect(bounds.textTop, JSON.stringify(bounds)).toBeGreaterThanOrEqual(bounds.top);
  expect(bounds.textBottom, JSON.stringify(bounds)).toBeLessThanOrEqual(bounds.bottom);
}

export async function previewGeometry(page: Page, locale: string) {
  const bounds = await page.evaluate(() => ({
    viewport: innerWidth,
    scrollX: window.scrollX,
    scroll: document.documentElement.scrollWidth,
    textOverflow: (() => {
      const items: { text: string; right: number }[] = [];
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walk.nextNode())) {
        if (!node.textContent?.trim()) continue;
        const r = document.createRange();
        r.selectNode(node);
        const b = r.getBoundingClientRect();
        if (b.width > 0 && b.right + window.scrollX > innerWidth)
          items.push({ text: node.textContent.slice(0, 60), right: b.right + window.scrollX });
      }
      return items.slice(0, 20);
    })(),
    fixed: [...document.querySelectorAll('body *')]
      .filter((e) => getComputedStyle(e).position === 'fixed')
      .map((e) => ({
        tag: e.tagName,
        class: e.className,
        role: e.getAttribute('role'),
        width: e.getBoundingClientRect().width,
        right: e.getBoundingClientRect().right,
        left: e.getBoundingClientRect().left,
        offset: e instanceof HTMLElement ? e.offsetLeft : null,
        transform: getComputedStyle(e).transform,
        scroll: e.scrollWidth,
        client: e.clientWidth,
        textRight: (() => {
          const range = document.createRange();
          range.selectNodeContents(e);
          return range.getBoundingClientRect().right;
        })(),
      })),
    overflow: [...document.querySelectorAll('body *')]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.right > innerWidth;
      })
      .slice(0, 15)
      .map((e) => ({
        tag: e.tagName,
        class: e.className,
        right: e.getBoundingClientRect().right,
        width: e.getBoundingClientRect().width,
        scroll: e.scrollWidth,
        client: e.clientWidth,
        position: getComputedStyle(e).position,
      })),
  }));
  expect(bounds.scroll, JSON.stringify({ locale, ...bounds })).toBeLessThanOrEqual(bounds.viewport);
}
