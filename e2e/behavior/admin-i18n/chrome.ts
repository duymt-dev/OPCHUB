import { expect, type Page, type Locator } from '@playwright/test';
import { languageOptions, provinces } from '@opchub/shared/fixtures';
import type { BrowserGuard } from './fixtures';

/** Native names are intentional selector identities; city examples keep proper names. */
const FIXED = [
  ...languageOptions.flatMap((option) => [option.native, option.country]),
  ...provinces.map((province) => province[0]),
  'E.g. OPC Đà Nẵng',
  'E.g. OPC Day Đà Nẵng invitation',
  'Nguyễn Văn A',
];

/** Exact default CSV/Excel header bytes, not translated Admin field-picker captions. */
export const EXPORT_PREVIEW_HEADERS = [
  'Nhóm',
  'Họ và tên',
  'Email',
  'Số điện thoại',
  'Loại tài khoản',
  'Công ty / Tổ chức',
  'Vai trò trong nhóm',
  'Ngày tham gia',
  'Trạng thái',
];

/** Scan visible accessible chrome, not textarea/input values, rich content or all API data. */
export async function englishChrome(
  page: Page,
  guard: BrowserGuard,
  filePreview?: Locator,
): Promise<void> {
  await guard.settle();
  const previewRoot = filePreview ? await filePreview.elementHandle() : null;
  const candidates = await page.evaluate((preview) => {
    const result: { tag: string; attribute: string; text: string; fileHeader?: boolean }[] = [];
    const visible = (element: Element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return (
        box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
      );
    };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      const chrome = parent?.closest('h1,h2,h3,button,label,th,[role="tab"],[role="columnheader"]');
      if (
        !parent ||
        !chrome ||
        !visible(parent) ||
        parent.closest('textarea,option,[contenteditable="true"]')
      )
        continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      if (!range.getBoundingClientRect().width) continue;
      const text = node.textContent?.trim();
      if (text)
        result.push({
          tag: chrome.tagName,
          attribute: 'text',
          text,
          fileHeader: Boolean(preview?.contains(chrome) && chrome.matches('th')),
        });
    }
    for (const element of document.querySelectorAll('[aria-label],[title],[placeholder]')) {
      if (!visible(element)) continue;
      for (const attribute of ['aria-label', 'title', 'placeholder']) {
        const text = element.getAttribute(attribute)?.trim();
        if (text) result.push({ tag: element.tagName, attribute, text });
      }
    }
    return result;
  }, previewRoot);
  await previewRoot?.dispose();
  // A response may reach the DOM between the first settle and the DOM snapshot.
  await guard.settle();
  const retained = [...FIXED, ...guard.raw]
    .filter((text) => typeof text === 'string')
    .sort((a, b) => b.length - a.length);
  const unreviewed = candidates.filter(({ text, fileHeader }) => {
    if (fileHeader && EXPORT_PREVIEW_HEADERS.includes(text)) return false;
    let chrome = text;
    for (const raw of retained) chrome = chrome.replaceAll(raw, '');
    return /[àáâãèéêìíòóôõùúýăđĩũơư\u1ea0-\u1ef9]/iu.test(chrome);
  });
  expect(unreviewed, 'Vietnamese chrome outside exact identities/API content fields').toEqual([]);
}
