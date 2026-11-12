'use client';

import { useCallback } from 'react';
import { useLocale } from 'next-intl';
import { numberText } from './number-text';

/** Strings only at render/toast boundaries; callers retain their original numeric values. */
export function useNumberText() {
  const locale = useLocale();
  return useCallback((value: number | null | undefined) => numberText(value, locale), [locale]);
}
