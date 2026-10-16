'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import styles from './investor-drawer.module.css';

/** Ô bình luận đáy drawer: Enter gửi, Shift+Enter xuống dòng (prototype ivKey) */
export function InvestorComposer({ onSend }: { onSend: (body: string) => Promise<unknown> }) {
  const d = useTranslations('investors.drawer');
  const [text, setText] = useState('');
  const ready = text.trim().length > 0;
  const send = () => {
    const v = text.trim();
    if (!v) return;
    void onSend(v).then(
      () => setText(''),
      () => undefined,
    );
  };
  return (
    <div className={styles.composer}>
      <textarea
        rows={2}
        value={text}
        placeholder={d('placeholder')}
        aria-label={d('placeholder')}
        className={styles.input}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
      />
      <button
        type="button"
        className={`${styles.send} ${ready ? styles.sendOn : ''}`}
        onClick={send}
      >
        {d('send')}
      </button>
    </div>
  );
}
