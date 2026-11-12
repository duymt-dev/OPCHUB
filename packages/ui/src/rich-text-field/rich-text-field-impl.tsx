'use client';

import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { useEffect, useState } from 'react';
import StarterKit from '@tiptap/starter-kit';
import { EditorLinkDialog } from './editor-link-dialog';
import { DEFAULT_RICH_TEXT_LABELS } from './labels';
import { RichTextToolbar } from './rich-text-toolbar';
import type { RichTextFieldProps } from './types';
import styles from './rich-text-field.module.css';

export function RichTextFieldImpl({
  value,
  onChange,
  placeholder,
  minHeight = 140,
  ariaLabel,
  errorId,
  labels,
  keyboardControls = false,
}: RichTextFieldProps) {
  const l = { ...DEFAULT_RICH_TEXT_LABELS, ...labels };
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3] },
        link: { openOnClick: false, protocols: ['http', 'https'] },
      }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: { attributes: { 'aria-label': ariaLabel ?? placeholder ?? '', role: 'textbox' } },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
  });
  // Lỗi tại ô đổi sau khi tạo editor → cập nhật thuộc tính DOM của ô soạn thảo
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    if (errorId) {
      dom.setAttribute('aria-invalid', 'true');
      dom.setAttribute('aria-describedby', errorId);
    } else {
      dom.removeAttribute('aria-invalid');
      dom.removeAttribute('aria-describedby');
    }
  }, [editor, errorId]);
  // null = đóng; chuỗi = mở, href hiện tại ('' nếu vùng chọn chưa là liên kết)
  const [link, setLink] = useState<string | null>(null);
  const closeLink = () => setLink(null);
  const empty = useEditorState({ editor, selector: (s) => s.editor?.isEmpty ?? !value }) ?? !value;

  return (
    <div className={styles.box} data-invalid-frame="">
      <RichTextToolbar
        editor={editor}
        labels={l}
        onLink={setLink}
        keyboardControls={keyboardControls}
      />
      <div className={styles.wrap}>
        {empty && placeholder ? <div className={styles.ph}>{placeholder}</div> : null}
        <EditorContent editor={editor} className={`rich ${styles.content}`} style={{ minHeight }} />
      </div>
      <EditorLinkDialog editor={editor} href={link} onDone={closeLink} labels={l} />
    </div>
  );
}
