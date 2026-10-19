'use client';

import { type FieldErrors, useFieldErrors, useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { fieldsOf, messageOf } from './api-errors';

/**
 * Lỗi tại ô cho một form (BUG-022): đánh dấu mọi ô sai cùng lúc, focus ô đầu, một toast.
 * - `check(errors)`: lỗi kiểm ở client → toast chữ lỗi đầu tiên (giữ toast prototype, V2Q-77);
 *   trả true khi có lỗi.
 * - `fromApi(e, map, fallback)`: `ApiError.fields` → lỗi tại ô + toast `errors.fixFields`;
 *   không có `fields` → toast thông điệp server (BUG-024).
 */
export function useFormErrors<K extends string>() {
  const fe = useFieldErrors<K>();
  const toast = useToast();
  const t = useTranslations('common.errors');

  const check = (errors: FieldErrors<K>): boolean => {
    const first = fe.show(errors);
    if (first !== undefined) toast(first);
    return first !== undefined;
  };

  const fromApi = (e: unknown, map: Readonly<Record<string, K>>, fallback: string) => {
    if (fe.show(fieldsOf(e, map)) !== undefined) toast(t('fixFields'));
    else toast(messageOf(e, fallback));
  };

  return { ...fe, check, fromApi };
}

export type FormErrors<K extends string> = ReturnType<typeof useFormErrors<K>>;
