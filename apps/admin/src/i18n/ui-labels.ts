'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { BulkBarProps, PaginationLabels, RichTextLabels } from '@opchub/ui';
import { formatNumber } from './format';
import { localeProfileOf } from './locales';
import { adminDatePresets, datePickerFormat } from './date-picker';

const EDITOR_KEYS = [
  'undo',
  'redo',
  'heading',
  'paragraph',
  'bold',
  'italic',
  'underline',
  'strike',
  'bulletList',
  'bulletListTitle',
  'orderedList',
  'orderedListTitle',
  'quote',
  'link',
  'linkTitle',
  'clear',
  'linkUrl',
  'linkInsert',
  'linkRemove',
  'linkCancel',
  'linkInvalid',
] as const;

/** All helpers are recomputed from the live locale; no translated labels enter QueryClient. */
export function useAdminUiLabels() {
  const t = useTranslations('ui');
  const locale = useLocale();
  const count = (n: number) => formatNumber(n, locale);
  const pagination: PaginationLabels = {
    number: count,
    unit: t('pagination.unit'),
    prev: t('pagination.prev'),
    next: t('pagination.next'),
    page: (n) => t('pagination.page', { n: count(n) }),
    pageSize: t('pagination.pageSize'),
    perPage: (n) => t('pagination.perPage', { n: count(n) }),
    range: (from, to, total, unit) =>
      t('pagination.range', {
        from: count(from),
        to: count(to),
        total: count(total),
        unit,
      }),
  };
  const bulk: Pick<BulkBarProps, 'selectedLabel' | 'clearLabel' | 'ariaLabel' | 'formatCount'> = {
    formatCount: count,
    selectedLabel: t('bulk.selected'),
    clearLabel: t('bulk.clear'),
    ariaLabel: t('bulk.aria'),
  };
  const editor = Object.fromEntries(
    EDITOR_KEYS.map((key) => [key, t(`editor.${key}`)]),
  ) as unknown as RichTextLabels;
  const presetLabels = [
    t('calendar.today'),
    t('calendar.week'),
    t('calendar.days30'),
    t('calendar.month'),
    t('calendar.previousMonth'),
  ];
  return {
    pagination,
    bulk,
    editor,
    close: t('close'),
    presetLabels,
    dateRange: {
      placeholder: [t('calendar.from'), t('calendar.to')] as [string, string],
      presets: adminDatePresets(presetLabels),
      dateLocale: localeProfileOf(locale).dayjs,
      format: datePickerFormat(locale),
    },
  };
}
