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

const purify = createDOMPurify(new JSDOM('').window as unknown as WindowLike);

/** HTML từ RichEditor (mô tả dự án, nội dung chiến dịch) sanitize lúc GHI — đọc ra không lọc lại (security.md › XSS) */
export function sanitizeRichHtml(html: string): string {
  return purify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}
