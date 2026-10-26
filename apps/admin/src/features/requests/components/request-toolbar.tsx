'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import styles from './requests.module.css';

interface Props {
  q: string;
  onSearch: (q: string) => void;
  onCsv: () => void;
}

/** Tiêu đề + chú thích + ô tìm + "Xuất CSV" (prototype v4 không chip trạng thái) */
export function RequestToolbar({ q, onSearch, onCsv }: Props) {
  const t = useTranslations('requests');
  const [text, setText] = useState(q);
  // `q` đổi từ ngoài (mở phiếu theo `?code=`) → ô tìm hiện đúng từ khoá
  const [seenQ, setSeenQ] = useState(q);
  if (q !== seenQ) {
    setSeenQ(q);
    setText(q);
  }
  return (
    <>
      <div className={styles.head}>
        <div className={styles.headText}>
          <h2 className={styles.heading}>{t('heading')}</h2>
          <span className={styles.sub}>{t('sub')}</span>
        </div>
        <input
          type="text"
          className={styles.search}
          value={text}
          placeholder={t('search')}
          aria-label={t('searchLabel')}
          onChange={(e) => {
            setText(e.target.value);
            onSearch(e.target.value);
          }}
        />
        <button type="button" className={styles.btn} onClick={onCsv}>
          {t('csv')}
        </button>
      </div>
    </>
  );
}
