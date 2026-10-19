'use client';

import type { Editor } from '@tiptap/react';
import { LinkDialog } from './link-dialog';

/** Nối `LinkDialog` với tiptap: chèn / sửa / gỡ liên kết trên vùng chọn (BUG-043) */
export function EditorLinkDialog({
  editor,
  href,
  onDone,
}: {
  editor: Editor | null;
  /** null = đóng; '' = mở, vùng chọn chưa là liên kết */
  href: string | null;
  onDone: () => void;
}) {
  const chain = () => editor?.chain().focus().extendMarkRange('link');
  return (
    <LinkDialog
      open={href !== null}
      initial={href || null}
      onClose={() => {
        onDone();
        editor?.commands.focus();
      }}
      onInsert={(url) => {
        chain()?.setLink({ href: url }).run();
        onDone();
      }}
      onRemove={() => {
        chain()?.unsetLink().run();
        onDone();
      }}
    />
  );
}
