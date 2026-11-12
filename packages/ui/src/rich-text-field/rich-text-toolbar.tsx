'use client';

import type { Editor } from '@tiptap/react';
import type { RichTextLabels } from './labels';
import { groups, type Tool } from './toolbar';
import styles from './rich-text-field.module.css';

interface Props {
  editor: Editor | null;
  labels: RichTextLabels;
  onLink: (href: string) => void;
  keyboardControls?: boolean;
}

export function RichTextToolbar({ editor, labels, onLink, keyboardControls = false }: Props) {
  const activate = (tool: Tool) => {
    if (!editor) return;
    if (tool.run !== 'link') return tool.run(editor);
    const href: unknown = editor.getAttributes('link').href;
    onLink(typeof href === 'string' ? href : '');
  };
  return (
    <div className={styles.bar} role="toolbar">
      {groups(labels).map((g, i) => (
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
                activate(tool);
              }}
              onKeyDown={
                keyboardControls
                  ? (ev) => {
                      if (ev.key !== 'Enter' && ev.key !== ' ') return;
                      ev.preventDefault();
                      if (!ev.repeat) activate(tool);
                    }
                  : undefined
              }
            >
              {tool.label}
            </button>
          ))}
        </span>
      ))}
    </div>
  );
}
