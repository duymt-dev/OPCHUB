'use client';

import { useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { ZodIssue } from 'zod';
import { formatNumber } from './format';
import { localIssueMessage } from './validation';

export type IssueMessage = (issue: ZodIssue | undefined) => string;

/** Local issues only; format the displayed bounds, never the values sent to a schema/API. */
export function useIssueMessage(override?: IssueMessage): IssueMessage {
  const t = useTranslations('ui');
  const locale = useLocale();
  return useCallback(
    (issue) => {
      if (override) return override(issue);
      if (!issue) return t('errors.invalid');
      return localIssueMessage(issue, (key, values) => {
        const display: { min?: string; max?: string } = {};
        if (values?.min !== undefined) display.min = formatNumber(values.min, locale);
        if (values?.max !== undefined) display.max = formatNumber(values.max, locale);
        return t(`errors.${key}`, display);
      });
    },
    [t, locale, override],
  );
}
