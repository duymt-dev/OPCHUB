'use client';

import type { Editor } from '@tiptap/react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { useEffect, useState } from 'react';
import StarterKit from '@tiptap/starter-kit';
import { EditorLinkDialog } from './editor-link-dialog';
import type { RichTextFieldProps } from './types';
import styles from './rich-text-field.module.css';

interface Tool {
  key: string;
  label: string;
  title: string;
  cls?: string | undefined;
  /** `link` → mở hộp nhập liên kết (BUG-043) thay vì chạy lệnh ngay */
  run: ((e: Editor) => void) | 'link';
}

/** Thanh công cụ như RichEd của prototype (hoàn tác, tiêu đề, định dạng, danh sách, liên kết) */
const GROUPS: Tool[][] = [
  [
    {
      key: 'un',
      label: '↶',
      title: 'Hoàn tác (Ctrl+Z)',
      cls: styles.big,
      run: (e) => e.chain().focus().undo().run(),
    },
    {
      key: 're',
      label: '↷',
      title: 'Làm lại (Ctrl+Y)',
      cls: styles.big,
      run: (e) => e.chain().focus().redo().run(),
    },
  ],
  [
    {
      key: 'h',
      label: 'H2',
      title: 'Tiêu đề',
      cls: styles.bold,
      run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    { key: 'p', label: '¶', title: 'Đoạn văn', run: (e) => e.chain().focus().setParagraph().run() },
  ],
  [
    {
      key: 'b',
      label: 'B',
      title: 'In đậm',
      cls: styles.bold,
      run: (e) => e.chain().focus().toggleBold().run(),
    },
    {
      key: 'i',
      label: 'I',
      title: 'In nghiêng',
      cls: styles.italic,
      run: (e) => e.chain().focus().toggleItalic().run(),
    },
    {
      key: 'u',
      label: 'U',
      title: 'Gạch chân',
      cls: styles.underline,
      run: (e) => e.chain().focus().toggleUnderline().run(),
    },
    {
      key: 's',
      label: 'S',
      title: 'Gạch ngang',
      cls: styles.strike,
      run: (e) => e.chain().focus().toggleStrike().run(),
    },
  ],
  [
    {
      key: 'ul',
      label: '• Danh sách',
      title: 'Danh sách',
      run: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
      key: 'ol',
      label: '1. Danh sách',
      title: 'Danh sách số',
      run: (e) => e.chain().focus().toggleOrderedList().run(),
    },
    {
      key: 'q',
      label: '❝',
      title: 'Trích dẫn',
      run: (e) => e.chain().focus().toggleBlockquote().run(),
    },
  ],
  [
    {
      key: 'a',
      label: 'Liên kết',
      title: 'Chèn liên kết',
      cls: styles.link,
      run: 'link',
    },
    {
      key: 'x',
      label: 'Xoá định dạng',
      title: 'Xoá định dạng',
      run: (e) => e.chain().focus().unsetAllMarks().clearNodes().run(),
    },
  ],
];

export function RichTextFieldImpl({
  value,
  onChange,
  placeholder,
  minHeight = 140,
  ariaLabel,
  errorId,
}: RichTextFieldProps) {
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
      <div className={styles.bar} role="toolbar">
        {GROUPS.map((g, i) => (
          <span key={g[0]?.key} className={styles.group}>
            {i > 0 ? <i className={styles.sep} /> : null}
            {g.map((tool) => (
              <button
                key={tool.key}
                type="button"
                title={tool.title}
                className={`${styles.tool} ${tool.cls ?? ''}`}
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  if (!editor) return;
                  if (tool.run !== 'link') return tool.run(editor);
                  const href: unknown = editor.getAttributes('link').href;
                  setLink(typeof href === 'string' ? href : '');
                }}
              >
                {tool.label}
              </button>
            ))}
          </span>
        ))}
      </div>
      <div className={styles.wrap}>
        {empty && placeholder ? <div className={styles.ph}>{placeholder}</div> : null}
        <EditorContent editor={editor} className={`rich ${styles.content}`} style={{ minHeight }} />
      </div>
      <EditorLinkDialog editor={editor} href={link} onDone={closeLink} />
    </div>
  );
}
