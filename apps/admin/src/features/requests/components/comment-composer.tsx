'use client';

import { RichTextField } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRequestActions } from '../hooks/use-request-actions';
import { useStaff } from '../hooks/use-requests';
import { hasText } from '../model';
import styles from './request-comments.module.css';
import { useAdminUiLabels } from '@/i18n/ui-labels';

/** Ô soạn bình luận nội bộ (RichTextField) + chip "Gắn tên" + "Gửi bình luận" */
export function CommentComposer({ code }: { code: string }) {
  const ui = useAdminUiLabels();
  const d = useTranslations('requests.drawer');
  const t = useTranslations('requests.toast');
  const staff = useStaff();
  const act = useRequestActions();
  const [html, setHtml] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  // Đổi key để dựng lại ô soạn trống sau khi gửi
  const [edKey, setEdKey] = useState(0);
  const toggle = (n: string) =>
    setMentions((m) => (m.includes(n) ? m.filter((x) => x !== n) : [...m, n]));
  const send = () => {
    if (!hasText(html)) return act.toast(t('emptyComment'));
    void act.comment(code, html, mentions).then(
      () => {
        setHtml('');
        setMentions([]);
        setEdKey((k) => k + 1);
      },
      () => undefined,
    );
  };

  return (
    <div className={styles.box}>
      <RichTextField
        labels={ui.editor}
        keyboardControls
        key={edKey}
        value={html}
        onChange={setHtml}
        minHeight={70}
        placeholder={d('editor')}
        ariaLabel={d('editor')}
      />
      <div className={styles.bar}>
        <span className={styles.tagLabel}>{d('mention')}</span>
        {(staff.data ?? []).map((s) => {
          const on = mentions.includes(s.name);
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              className={`${styles.chip} ${on ? styles.chipOn : ''}`}
              onClick={() => toggle(s.name)}
            >
              @{s.name}
            </button>
          );
        })}
        <span className={styles.grow} />
        <button type="button" className={styles.send} onClick={send}>
          {d('send')}
        </button>
      </div>
    </div>
  );
}
