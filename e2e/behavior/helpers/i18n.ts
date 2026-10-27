import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Page } from '../../server/test';
import { PORTAL_URL } from '../../urls';

/**
 * TIP-V2-117 / D-65: tiện ích e2e Portal đa ngôn ngữ. Chuỗi mong đợi đọc thẳng từ
 * `apps/portal/messages/<bộ>` nên người soát sửa bản dịch không làm vỡ test.
 */

const MSG_DIR = fileURLToPath(new URL('../../../apps/portal/messages/', import.meta.url));
type Tree = { [k: string]: string | Tree };

const cache = new Map<string, Tree>();
function load(bundle: string, ns: string): Tree {
  const key = `${bundle}/${ns}`;
  let tree = cache.get(key);
  if (!tree) {
    tree = JSON.parse(readFileSync(`${MSG_DIR}${key}.json`, 'utf8')) as Tree;
    cache.set(key, tree);
  }
  return tree;
}

export function msg(bundle: string, ns: string, path: string): string {
  const v = path
    .split('.')
    .reduce<string | Tree | undefined>(
      (node, k) => (node && typeof node === 'object' ? node[k] : undefined),
      load(bundle, ns),
    );
  if (typeof v !== 'string') throw new Error(`thiếu ${bundle}/${ns}.${path}`);
  return v;
}

export const title = (bundle: string, page: string) =>
  msg(bundle, 'common', 'meta.title').replace('{page}', msg(bundle, 'common', `meta.${page}`));

/** Bộ dịch ≠ vi (thứ tự commit dịch) */
export const BUNDLES = ['en', 'id', 'ms', 'th', 'zh', 'fil', 'km', 'lo', 'my'] as const;

/** Mã ngôn ngữ → bộ dịch (D-65: `en-SG` dùng `en`, `ms-BN` dùng `ms`) */
export const CASES: [code: string, bundle: string][] = [
  ...BUNDLES.map((b): [string, string] => [b, b]),
  ['en-SG', 'en'],
  ['ms-BN', 'ms'],
];

const VI_MARK = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

/**
 * Chuỗi giao diện tiếng Việt (có dấu, không biến) mà bộ `bundle` đã dịch khác đi — nếu một nút
 * chữ trên màn trùng khớp nguyên văn thì là chuỗi cứng/sót dịch. So khớp nguyên văn nên dữ liệu
 * người dùng (tên, nhóm seed tiếng Việt) không bị bắt nhầm.
 */
export function viLeftovers(bundle: string, namespaces: string[]): string[] {
  const out = new Set<string>();
  const walk = (vi: string | Tree, tr: string | Tree | undefined) => {
    if (typeof vi === 'string') {
      if (VI_MARK.test(vi) && !vi.includes('{') && !vi.includes('<') && vi !== tr) out.add(vi);
      return;
    }
    for (const [k, v] of Object.entries(vi))
      walk(v, tr && typeof tr === 'object' ? tr[k] : undefined);
  };
  for (const ns of namespaces) walk(load('vi', ns), load(bundle, ns));
  return [...out];
}

/** Nút chữ đang hiển thị trên trang trùng nguyên văn một chuỗi trong `needles` */
export async function visibleMatches(page: Page, needles: string[]): Promise<string[]> {
  return page.evaluate((list) => {
    const want = new Set(list);
    const hits = new Set<string>();
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const s = n.textContent?.trim();
      const el = n.parentElement;
      if (s && want.has(s) && el?.checkVisibility()) hits.add(s);
    }
    return [...hits];
  }, needles);
}

export const scrollWidth = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth);

export async function setLocale(page: Page, code: string) {
  await page.context().addCookies([{ name: 'NEXT_LOCALE', value: code, url: PORTAL_URL }]);
}

export async function signIn(page: Page, bundle: string) {
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill('User@2026');
  // TIP-V2-559 ghim aria-label = nhãn gốc ("登录"); dấu cách antd chèn chỉ ở chữ hiển thị
  const name = msg(bundle, 'auth', 'login.submit');
  await page.getByRole('button', { name, exact: true }).click();
  await page.waitForURL(/\/dashboard/);
}
