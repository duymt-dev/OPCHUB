'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { RichEditorProps } from './types';

/** Khung soạn thảo: StarterKit (đậm, nghiêng, tiêu đề, danh sách, trích dẫn). Toolbar làm ở L1. */
export function RichEditorImpl({ value, onChange, minHeight = 160 }: RichEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [3] } })],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  return (
    <div
      className="rich"
      style={{ border: '1px solid #D9D9D9', borderRadius: 6, padding: '8px 12px', minHeight }}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
