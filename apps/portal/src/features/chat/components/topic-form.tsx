'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import styles from './topic-form.module.css';

interface Props {
  onCreate: (name: string, description: string) => Promise<unknown>;
}

/** Form inline "Tạo chủ đề thảo luận" — mọi thành viên nhóm đều tạo được */
export function TopicForm({ onCreate }: Props) {
  const t = useTranslations('chat.list');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const submit = () => {
    const n = name.trim();
    if (!n) return;
    void onCreate(n, desc.trim()).then((ok) => {
      if (!ok) return;
      setName('');
      setDesc('');
    });
  };

  return (
    <div className={styles.form}>
      <span className={styles.title}>{t('formTitle')}</span>
      <input
        className={`${styles.input} ${styles.desc}`}
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder={t('descPh')}
        aria-label={t('descPh')}
      />
      <div className={styles.row}>
        <input
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder={t('namePh')}
          aria-label={t('namePh')}
        />
        <button type="button" className={styles.create} onClick={submit}>
          {t('create')}
        </button>
      </div>
      <span className={styles.hint}>{t('formHint')}</span>
    </div>
  );
}
