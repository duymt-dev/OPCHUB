'use client';

import type { PaginationLabels, RichTextLabels } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { UploadImageError } from '@/lib/upload-image';

/** D-65: nhãn mặc định của `Pagination` theo ngôn ngữ; `unit` riêng từng màn ghi đè sau */
export function usePagerLabels(): PaginationLabels {
  const t = useTranslations('common.pager');
  return {
    unit: t('unit'),
    prev: t('prev'),
    next: t('next'),
    page: (n) => t('page', { n }),
    pageSize: t('pageSize'),
    perPage: (n) => t('perPage', { n }),
    range: (from, to, total, unit) => t('range', { from, to, total, unit }),
  };
}

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
] as const satisfies readonly (keyof RichTextLabels)[];

/** D-65: nhãn thanh công cụ + hộp liên kết của `RichTextField` theo ngôn ngữ */
export function useEditorLabels(): RichTextLabels {
  const t = useTranslations('common.editor');
  return Object.fromEntries(EDITOR_KEYS.map((k) => [k, t(k)])) as unknown as RichTextLabels;
}

/** D-65: thông báo lỗi tải ảnh theo ngôn ngữ (`UploadImageError` mang mã) */
export function useUploadErrorText(): (e: unknown, fallback: string) => string {
  const t = useTranslations('common.upload');
  return (e, fallback) => {
    if (e instanceof UploadImageError) return t(e.code);
    // `UploadImage` của ui chỉ chuyển `message` (= mã) lên
    if (e === 'type' || e === 'failed') return t(e);
    if (typeof e === 'string' && e) return e;
    return e instanceof Error && e.message ? e.message : fallback;
  };
}
