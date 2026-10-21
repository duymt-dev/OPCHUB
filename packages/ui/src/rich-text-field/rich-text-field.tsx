'use client';

import { RichTextFieldImpl } from './rich-text-field-impl';
import type { RichTextFieldProps } from './types';

/**
 * Ô soạn thảo có thanh công cụ như prototype (mô tả dự án, ghi chú…).
 * Tiptap dựng với `immediatelyRender: false` nên an toàn khi SSR; thanh công cụ có ngay khi tải.
 * Nội dung hiển thị lại phải qua `SafeHtml`.
 */
export const RichTextField = RichTextFieldImpl;
export type { RichTextFieldProps };
export type { RichTextLabels } from './labels';
