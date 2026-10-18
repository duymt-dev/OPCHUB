/**
 * Lỗi tại ô (BUG-022, §6 "báo lỗi tại trường"): khoá ô → chữ lỗi đã dịch.
 * Thứ tự khoá = thứ tự kiểm của form (prototype) → khoá đầu là ô được focus + đọc `role=alert`.
 */
export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

/** Một lỗi trường trong envelope `ApiError.fields` của server */
export interface ApiFieldIssue {
  path: string;
  message: string;
}

/**
 * Ánh xạ `fields[].path` của server sang khoá ô. Đường dẫn lồng tra từ dài tới ngắn
 * (`phone.number` → `phone.number` rồi `phone`). Có `map` thì bỏ path không có trong map;
 * không có `map` thì dùng nguyên path. Mỗi ô giữ thông điệp đầu tiên.
 */
export function fieldErrorsFrom<K extends string = string>(
  fields: readonly ApiFieldIssue[],
  map?: Readonly<Record<string, K>>,
): FieldErrors<K> {
  const out: FieldErrors<K> = {};
  for (const f of fields) {
    const key = map ? lookup(f.path, map) : (f.path as K);
    if (key !== undefined && out[key] === undefined) out[key] = f.message;
  }
  return out;
}

function lookup<K extends string>(path: string, map: Readonly<Record<string, K>>): K | undefined {
  const parts = path.split('.');
  for (let n = parts.length; n > 0; n -= 1) {
    const hit = map[parts.slice(0, n).join('.')];
    if (hit !== undefined) return hit;
  }
  return undefined;
}

/** Khoá đầu tiên có lỗi (theo thứ tự kiểm) */
export function firstErrorKey<K extends string>(errors: FieldErrors<K>): K | undefined {
  return (Object.keys(errors) as K[]).find((k) => errors[k] !== undefined);
}

export const hasErrors = (errors: FieldErrors): boolean => firstErrorKey(errors) !== undefined;

const FOCUSABLE = 'input, select, textarea, button, [contenteditable="true"], [tabindex]';

/**
 * Focus ô sai đầu tiên trong `root`: ô có `aria-describedby` chứa `errorId` nếu có, không thì ô
 * đầu tiên `aria-invalid="true"`. Ô là nhóm (radiogroup, nhóm chip) → focus phần tử con đầu tiên.
 */
export function focusFirstInvalid(root: ParentNode, errorId?: string): HTMLElement | null {
  const sel = errorId ? `[aria-describedby~="${errorId}"]` : '[aria-invalid="true"]';
  const el = root.querySelector<HTMLElement>(sel);
  if (!el) return null;
  const target = el.matches(FOCUSABLE) ? el : el.querySelector<HTMLElement>(FOCUSABLE);
  (target ?? el).focus();
  return target ?? el;
}
