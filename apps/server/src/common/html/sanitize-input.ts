import { ZodError, type z } from 'zod';
import { AppError } from '../errors';
import { sanitizeRichHtml, toPlainText } from './sanitize';

export interface SanitizeOptions {
  /** Đường dẫn trường rich text (`description`, `lines.*.body`) — phần tử mảng ghi là `*` */
  rich?: readonly string[] | undefined;
}

export interface SanitizeResult<T> {
  value: T;
  /** Đường dẫn (dạng `a.0.b`) các chuỗi bị đổi */
  changed: string[];
}

/** Khoá đã có zod kiểm định dạng hoặc phải giữ nguyên byte (mật khẩu, mã, khoá bí mật) */
const SKIP_KEY = /(password|token|code|otp|secret|key|signature|url|href|email)$/i;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Date);

/**
 * Biên chung (NA-27, BUG-020): duyệt object/array SAU khi zod parse. Chuỗi ở đường dẫn `rich` →
 * `sanitizeRichHtml`; chuỗi khác → `toPlainText`; bỏ qua khoá nhạy cảm/đã kiểm định dạng.
 */
export function sanitizeInput<T>(value: T, opts: SanitizeOptions = {}): SanitizeResult<T> {
  const rich = new Set(opts.rich ?? []);
  const changed: string[] = [];

  const walk = (v: unknown, pattern: string[], path: string[], key: string): unknown => {
    if (typeof v === 'string') {
      if (key && SKIP_KEY.test(key)) return v;
      const out = rich.has(pattern.join('.')) ? sanitizeRichHtml(v) : toPlainText(v);
      if (out !== v) changed.push(path.join('.'));
      return out;
    }
    if (Array.isArray(v)) {
      return v.map((x, i) => walk(x, [...pattern, '*'], [...path, String(i)], key));
    }
    if (isRecord(v)) {
      const next: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) next[k] = walk(x, [...pattern, k], [...path, k], k);
      return next;
    }
    return v;
  };

  const out = walk(value, [], [], '');
  return { value: (changed.length ? out : value) as T, changed };
}

export const EMPTY_AFTER_SANITIZE = 'Nội dung không hợp lệ';

/**
 * Parse bằng zod → làm sạch → (nếu có đổi) parse lại bằng chính schema để giữ ràng buộc
 * (VD bình luận chỉ có `<script>` thành rỗng → 400 `fields[{path:'body'}]`).
 */
export function parseClean<S extends z.ZodType>(
  schema: S,
  raw: unknown,
  opts: SanitizeOptions = {},
): z.output<S> {
  const parsed = schema.parse(raw);
  const { value, changed } = sanitizeInput(parsed, opts);
  if (!changed.length) return parsed;
  try {
    return schema.parse(value);
  } catch (err) {
    if (!(err instanceof ZodError)) throw err;
    const touched = new Set(changed);
    const fields = err.issues.map((i) => {
      const path = i.path.join('.');
      return { path, message: touched.has(path) ? EMPTY_AFTER_SANITIZE : i.message };
    });
    throw new AppError('VALIDATION_ERROR', 'Dữ liệu không hợp lệ', fields);
  }
}
