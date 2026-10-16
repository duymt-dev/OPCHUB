'use client';

import { Skeleton } from 'antd';
import dynamic from 'next/dynamic';
import type { RichEditorProps } from './types';

/** Tiptap nặng — chỉ tải ở client khi trang cần soạn thảo */
export const RichEditor = dynamic<RichEditorProps>(
  () => import('./rich-editor-impl').then((m) => m.RichEditorImpl),
  { ssr: false, loading: () => <Skeleton.Input active block style={{ height: 160 }} /> },
);
