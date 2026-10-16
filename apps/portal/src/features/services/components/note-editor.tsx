'use client';

import { sanitizeHtml } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { Fragment, useRef } from 'react';
import type { MouseEvent } from 'react';
import styles from './note-editor.module.css';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder: string;
}

type TitleKey =
  | 'undo'
  | 'redo'
  | 'heading'
  | 'paragraph'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'bullet'
  | 'ordered'
  | 'quote'
  | 'link'
  | 'clear';

interface Tool {
  title: TitleKey;
  /** Nhãn cố định hoặc khoá i18n */
  label: string | { key: 'bulletLabel' | 'orderedLabel' | 'linkLabel' | 'clear' };
  cmd: string;
  arg?: string;
  cls?: string | undefined;
}

/** Nhóm nút như RichEd của prototype */
const GROUPS: Tool[][] = [
  [
    { title: 'undo', label: '↶', cmd: 'undo', cls: styles.big },
    { title: 'redo', label: '↷', cmd: 'redo', cls: styles.big },
  ],
  [
    { title: 'heading', label: 'H2', cmd: 'formatBlock', arg: '<h3>', cls: styles.bold },
    { title: 'paragraph', label: '¶', cmd: 'formatBlock', arg: '<p>' },
  ],
  [
    { title: 'bold', label: 'B', cmd: 'bold', cls: styles.bold },
    { title: 'italic', label: 'I', cmd: 'italic', cls: styles.italic },
    { title: 'underline', label: 'U', cmd: 'underline', cls: styles.under },
    { title: 'strike', label: 'S', cmd: 'strikeThrough', cls: styles.strike },
  ],
  [
    { title: 'bullet', label: { key: 'bulletLabel' }, cmd: 'insertUnorderedList' },
    { title: 'ordered', label: { key: 'orderedLabel' }, cmd: 'insertOrderedList' },
    { title: 'quote', label: '❝', cmd: 'formatBlock', arg: '<blockquote>' },
  ],
  [
    { title: 'link', label: { key: 'linkLabel' }, cmd: 'createLink', cls: styles.link },
    { title: 'clear', label: { key: 'clear' }, cmd: 'removeFormat' },
  ],
];

/**
 * Ô "Mô tả nhu cầu" có thanh định dạng (contenteditable như prototype, không thêm thư viện).
 * Đầu ra lọc qua `sanitizeHtml`; khi G3b đưa `RichTextField` vào packages/ui thì thay bằng nó.
 */
export function NoteEditor({ value, onChange, placeholder }: Props) {
  const t = useTranslations('services.editor');
  const ref = useRef<HTMLDivElement>(null);
  const emit = () => onChange(sanitizeHtml((ref.current?.innerHTML ?? '').replace(/^<br>$/, '')));

  const run = (cmd: string, arg?: string) => (e: MouseEvent) => {
    e.preventDefault();
    ref.current?.focus();
    let v = arg;
    if (cmd === 'createLink') {
      const url = window.prompt(t('linkPrompt'));
      if (!url || !/^https?:\/\//i.test(url)) return;
      v = url;
    }
    document.execCommand(cmd, false, v);
    emit();
  };
  const empty = !value.replace(/<[^>]*>/g, '').trim();

  return (
    <div className={styles.box}>
      <div className={styles.toolbar}>
        {GROUPS.map((g, gi) => (
          <Fragment key={gi}>
            {gi ? <i className={styles.sep} /> : null}
            {g.map((tool) => (
              <button
                key={tool.title}
                type="button"
                title={t(tool.title)}
                className={`${styles.tool} ${tool.cls ?? ''}`}
                onMouseDown={run(tool.cmd, tool.arg)}
              >
                {typeof tool.label === 'string' ? tool.label : t(tool.label.key)}
              </button>
            ))}
          </Fragment>
        ))}
      </div>
      <div className={styles.wrap}>
        {empty ? <div className={styles.placeholder}>{placeholder}</div> : null}
        <div
          ref={ref}
          className={`rich ${styles.editor}`}
          contentEditable
          role="textbox"
          aria-multiline="true"
          aria-label={placeholder}
          suppressContentEditableWarning
          onInput={emit}
          onBlur={emit}
        />
      </div>
    </div>
  );
}
