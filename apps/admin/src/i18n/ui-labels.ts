'use client';

import { useLocale, useTranslations } from 'next-intl';
import dayjs from 'dayjs';
import type { BulkBarProps, PaginationLabels, RichTextLabels } from '@opchub/ui';
import { formatNumber } from './format';
import { localeProfileOf } from './locales';

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
    unit: t('pagination.unit'),
    prev: t('pagination.prev'),
    next: t('pagination.next'),
    page: (n) => t('pagination.page', { n }),
    pageSize: t('pagination.pageSize'),
    perPage: (n) => t('pagination.perPage', { n }),
    range: (from, to, total, unit) =>
      t('pagination.range', {
        from: count(from),
        to: count(to),
        total: count(total),
        unit,
      }),
  };
  const bulk: Pick<BulkBarProps, 'selectedLabel' | 'clearLabel' | 'ariaLabel'> = {
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
  const today = dayjs();
  const previous = today.subtract(1, 'month');
  const ranges: [dayjs.Dayjs, dayjs.Dayjs][] = [
    [today.startOf('day'), today.endOf('day')],
    [today.subtract(6, 'day').startOf('day'), today.endOf('day')],
    [today.subtract(29, 'day').startOf('day'), today.endOf('day')],
    [today.startOf('month'), today.endOf('month')],
    [previous.startOf('month'), previous.endOf('month')],
  ];
  return {
    pagination,
    bulk,
    editor,
    close: t('close'),
    presetLabels,
    dateRange: {
      placeholder: [t('calendar.from'), t('calendar.to')] as [string, string],
      presets: ranges.map((value, index) => ({ label: presetLabels[index] ?? '', value })),
      dateLocale: localeProfileOf(locale).dayjs,
    },
  };
}
