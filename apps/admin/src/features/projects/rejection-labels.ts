'use client';

import { useTranslations } from 'next-intl';
import { REVIEW_REASONS } from './types';

export function useRejectionLabels() {
  const t = useTranslations('ui');
  const raw: unknown = t.raw('reviewReasons');
  const labels: readonly unknown[] = Array.isArray(raw) ? raw : [];
  return REVIEW_REASONS.map((value, index) => ({
    value,
    label: typeof labels[index] === 'string' ? labels[index] : value,
  }));
}
