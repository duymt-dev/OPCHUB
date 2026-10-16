'use client';

import DOMPurify from 'dompurify';
import { useMemo } from 'react';

const ALLOWED_TAGS = [
  'p',
  'br',
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'h3',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
];
const ALLOWED_ATTR = ['href', 'target', 'rel'];

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}

export interface SafeHtmlProps {
  html: string;
  className?: string;
}

/** Nơi DUY NHẤT được render HTML do người dùng nhập (đã lọc bằng DOMPurify) */
export function SafeHtml({ html, className }: SafeHtmlProps) {
  const clean = useMemo(() => sanitizeHtml(html), [html]);
  return <div className={className ?? 'rich'} dangerouslySetInnerHTML={{ __html: clean }} />;
}
