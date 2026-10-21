'use client';

import {
  Pagination,
  type PaginationProps,
  RichTextField,
  type RichTextFieldProps,
} from '@opchub/ui';
import { useEditorLabels, usePagerLabels } from './ui-labels';

/** `Pagination` với nhãn theo ngôn ngữ (D-65); `labels` truyền vào (vd `unit`) ghi đè */
export function LocalizedPagination({ labels, ...rest }: PaginationProps) {
  const base = usePagerLabels();
  return <Pagination {...rest} labels={{ ...base, ...labels }} />;
}

/** `RichTextField` với nhãn thanh công cụ theo ngôn ngữ (D-65) */
export function LocalizedRichTextField({ labels, ...rest }: RichTextFieldProps) {
  const base = useEditorLabels();
  return <RichTextField {...rest} labels={{ ...base, ...labels }} />;
}
