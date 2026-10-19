import createDOMPurify, { type WindowLike } from 'dompurify';
// Khai báo kiểu tối thiểu ở src/types/jsdom.d.ts
import { JSDOM } from 'jsdom';

/** Cùng danh sách thẻ với `SafeHtml` (packages/ui) — RichEditor chỉ sinh các thẻ này */
const ALLOWED_TAGS = [
  'p',
  'br',
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'h3',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
];
const ALLOWED_ATTR = ['href', 'target', 'rel'];

/**
 * NA-27: liên kết chỉ http/https/mailto hoặc đúng một biến email (`{{link_dang_nhap}}`).
 * Đường dẫn tương đối, `javascript:`, `data:` … bị bỏ `href` (giữ chữ).
 */
export const ALLOWED_URI_REGEXP = /^(?:https?:|mailto:|\{\{[a-z_]+\}\}$)/i;

const LINK_REL = 'noopener noreferrer';

/** Server không nạp lib DOM — chỉ khai phần node jsdom dùng tới */
interface DomElement {
  readonly nodeName: string;
  hasAttribute(name: string): boolean;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}
interface DomFragment {
  readonly textContent: string | null;
}

const windowOf = () => new JSDOM('').window as unknown as WindowLike;

const richPurify = createDOMPurify(windowOf());
// Mọi <a> còn lại: rel cố định; target chỉ nhận `_blank`
richPurify.addHook('afterSanitizeAttributes', (raw: unknown) => {
  const node = raw as DomElement;
  if (node.nodeName !== 'A') return;
  node.setAttribute('rel', LINK_REL);
  if (node.hasAttribute('target') && node.getAttribute('target') !== '_blank') {
    node.removeAttribute('target');
  }
});

const plainPurify = createDOMPurify(windowOf());

/**
 * HTML từ RichEditor (mô tả dự án/sự kiện, nội dung chiến dịch, ghi chú…) sanitize lúc GHI — đọc
 * ra không lọc lại (security.md › XSS). Idempotent. Biến email `{{ten}}` giữ nguyên.
 */
export function sanitizeRichHtml(html: string): string {
  return richPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP,
    // `target`/`rel` không phải URI — không kiểm bằng ALLOWED_URI_REGEXP
    ADD_URI_SAFE_ATTR: ['target', 'rel'],
  });
}

const MARKUP = /<\/?[a-z][a-z0-9-]*[\s>/]|<!--/i;

/** Chuỗi có dạng thẻ HTML / chú thích — `"2 < 3"`, `"a<b"`, `"R&D"` thì không */
export function looksLikeMarkup(s: string): boolean {
  return MARKUP.test(s);
}

/** Một lượt bỏ thẻ: nội dung `script/style` bị bỏ, chữ còn lại giữ nguyên (không escape) */
function stripOnce(s: string): string {
  const frag: unknown = plainPurify.sanitize(s, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
    RETURN_DOM_FRAGMENT: true,
  });
  return (frag as DomFragment).textContent ?? '';
}

/**
 * Chuỗi người dùng không phải rich text: bỏ thẻ HTML, giữ chữ. Không đổi chuỗi không giống markup.
 * Lặp tới khi ổn định (VD `&lt;b&gt;` giải mã thành `<b>`) để kết quả idempotent.
 */
export function toPlainText(s: string): string {
  let cur = s;
  for (let i = 0; i < 5 && looksLikeMarkup(cur); i += 1) cur = stripOnce(cur);
  return cur;
}
