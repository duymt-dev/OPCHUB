'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { FieldErrorProps } from './field-error';
import { type FieldErrors, firstErrorKey, focusFirstInvalid } from './field-errors';

/** Đổi map khoá-lỗi (kết quả `validate*`) sang chữ hiển thị, giữ thứ tự khoá */
export function translateErrors<K extends string, E extends string>(
  errors: Partial<Record<K, E>>,
  t: (key: E, field: K) => string,
): FieldErrors<K> {
  const out: FieldErrors<K> = {};
  for (const k of Object.keys(errors) as K[]) {
    const e = errors[k];
    if (e !== undefined) out[k] = t(e, k);
  }
  return out;
}

/**
 * State lỗi tại ô của một form (BUG-022): `show` đặt toàn bộ lỗi, hẹn focus ô đầu tiên sau khi
 * vẽ và trả chữ lỗi đầu tiên (undefined = hợp lệ); `clear` xoá lỗi của ô vừa sửa;
 * `err(k)` trả props cho `<FieldError>` + `invalidProps`.
 */
export function useFieldErrors<K extends string>() {
  const base = useId();
  const [errors, setErrors] = useState<FieldErrors<K>>({});
  const pendingFocus = useRef<string | null>(null);
  const first = firstErrorKey(errors);
  const idOf = useCallback((k: K) => `${base}-${k}`, [base]);

  // Focus sau khi DOM đã có aria-describedby của ô đầu tiên
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    focusFirstInvalid(document, id);
  });

  const show = useCallback(
    (next: FieldErrors<K>): string | undefined => {
      setErrors(next);
      const k = firstErrorKey(next);
      pendingFocus.current = k === undefined ? null : idOf(k);
      return k === undefined ? undefined : next[k];
    },
    [idOf],
  );

  /** Xoá lỗi các ô vừa sửa (khoá lạ bị bỏ qua — truyền thẳng khoá state được) */
  const clear = useCallback((...keys: readonly string[]) => {
    setErrors((cur) => {
      const hit = keys.filter((k): k is K => k in cur);
      if (!hit.length) return cur;
      const next = { ...cur };
      for (const k of hit) delete next[k];
      return next;
    });
  }, []);

  const err = (k: K): FieldErrorProps | undefined => {
    const text = errors[k];
    return text ? { id: idOf(k), text, alert: k === first } : undefined;
  };

  return { errors, show, clear, err };
}

export type FieldErrorsState<K extends string> = ReturnType<typeof useFieldErrors<K>>;
