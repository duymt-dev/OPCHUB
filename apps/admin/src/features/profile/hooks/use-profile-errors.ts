'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import type { FormInstance } from 'antd';
import { profileFormErrors } from '../form-errors';
import type { LocalIssueTranslator } from '@/i18n/validation';

/** Only client Zod issues are re-rendered. API errors remain raw and never enter this ref. */
export function useProfileErrors<T>(
  form: FormInstance<T>,
  keys: readonly string[],
  fallback: string,
) {
  const t = useTranslations('ui');
  const local = useRef<z.ZodError | null>(null);
  useEffect(() => {
    if (!local.current) return;
    // Do not resurrect errors cleared by editing a field. Hidden fields use the visible toast.
    const issues = local.current.issues.filter((issue) => {
      const key = issue.path.join('.');
      const name = key as Parameters<FormInstance<T>['getFieldError']>[0];
      return keys.includes(key) && form.getFieldError(name).length > 0;
    });
    if (issues.length)
      profileFormErrors(form, new z.ZodError(issues), keys, fallback, (key, values) =>
        t(`errors.${key}`, values),
      );
  }, [form, keys, fallback, t]);

  return (error: unknown) => {
    local.current = error instanceof z.ZodError ? error : null;
    const translate: LocalIssueTranslator = (key, values) => t(`errors.${key}`, values);
    return profileFormErrors(form, error, keys, fallback, translate);
  };
}
