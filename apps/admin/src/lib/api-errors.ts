import { type FieldErrors, fieldErrorsFrom } from '@opchub/ui';
import { ApiError } from './api-client';

/** Thông điệp hiển thị của lỗi API (BUG-024): `ApiError` → thông điệp server, còn lại → `fallback` */
export const messageOf = (e: unknown, fallback: string): string =>
  e instanceof ApiError && e.message ? e.message : fallback;

/**
 * Lỗi tại ô từ `ApiError.fields` (BUG-022): `map` đổi path server → khoá ô của form
 * (vd `phone.number` → `phone`). Không phải `ApiError` / không có `fields` → `{}`.
 */
export function fieldsOf<K extends string>(
  e: unknown,
  map?: Readonly<Record<string, K>>,
): FieldErrors<K> {
  return e instanceof ApiError ? fieldErrorsFrom<K>(e.fields, map) : {};
}
