import type { Editor } from '@tiptap/react';
import type { RichTextLabels } from './labels';
import styles from './rich-text-field.module.css';

export interface Tool {
  key: string;
  label: string;
  title: string;
  cls?: string | undefined;
  /** `link` → mở hộp nhập liên kết (BUG-043) thay vì chạy lệnh ngay */
  run: ((e: Editor) => void) | 'link';
}

const go = (e: Editor) => e.chain().focus();

const history = (l: RichTextLabels): Tool[] => [
  { key: 'un', label: '↶', title: l.undo, cls: styles.big, run: (e) => go(e).undo().run() },
  { key: 're', label: '↷', title: l.redo, cls: styles.big, run: (e) => go(e).redo().run() },
];

const blocks = (l: RichTextLabels): Tool[] => [
  {
    key: 'h',
    label: 'H2',
    title: l.heading,
    cls: styles.bold,
    run: (e) => go(e).toggleHeading({ level: 3 }).run(),
  },
  { key: 'p', label: '¶', title: l.paragraph, run: (e) => go(e).setParagraph().run() },
];

const marks = (l: RichTextLabels): Tool[] => [
  { key: 'b', label: 'B', title: l.bold, cls: styles.bold, run: (e) => go(e).toggleBold().run() },
  {
    key: 'i',
    label: 'I',
    title: l.italic,
    cls: styles.italic,
    run: (e) => go(e).toggleItalic().run(),
  },
  {
    key: 'u',
    label: 'U',
    title: l.underline,
    cls: styles.underline,
    run: (e) => go(e).toggleUnderline().run(),
  },
  {
    key: 's',
    label: 'S',
    title: l.strike,
    cls: styles.strike,
    run: (e) => go(e).toggleStrike().run(),
  },
];

const lists = (l: RichTextLabels): Tool[] => [
  {
    key: 'ul',
    label: l.bulletList,
    title: l.bulletListTitle,
    run: (e) => go(e).toggleBulletList().run(),
  },
  {
    key: 'ol',
    label: l.orderedList,
    title: l.orderedListTitle,
    run: (e) => go(e).toggleOrderedList().run(),
  },
  { key: 'q', label: '❝', title: l.quote, run: (e) => go(e).toggleBlockquote().run() },
];

const links = (l: RichTextLabels): Tool[] => [
  { key: 'a', label: l.link, title: l.linkTitle, cls: styles.link, run: 'link' },
  {
    key: 'x',
    label: l.clear,
    title: l.clear,
    run: (e) => go(e).unsetAllMarks().clearNodes().run(),
  },
];

/** Thanh công cụ như RichEd của prototype (hoàn tác, tiêu đề, định dạng, danh sách, liên kết) */
export const groups = (l: RichTextLabels): Tool[][] => [
  history(l),
  blocks(l),
  marks(l),
  lists(l),
  links(l),
];
