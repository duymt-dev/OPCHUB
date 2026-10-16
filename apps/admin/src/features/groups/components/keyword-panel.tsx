'use client';

import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useKeywordMutations, useKeywords } from '../hooks/use-moderation';
import styles from './moderation.module.css';

/** "Bộ lọc từ khóa": bấm chip để xóa, Thêm (hoặc Enter) để thêm */
export function KeywordPanel() {
  const t = useTranslations('groups.mod');
  const tt = useTranslations('groups.toast');
  const toast = useToast();
  const words = useKeywords().data ?? [];
  const { add, remove } = useKeywordMutations();
  const [draft, setDraft] = useState('');

  const submit = (withToast: boolean) => {
    const w = draft.trim();
    if (!w || words.includes(w)) return;
    add.mutate(w, {
      onSuccess: () => {
        setDraft('');
        if (withToast) toast(tt('kwAdded', { word: w }));
      },
    });
  };

  return (
    <aside className={styles.kw}>
      <div className={styles.kwHead}>
        <span className={styles.kwTitle}>{t('keywords')}</span>
        <span className={styles.kwCount}>{t('kwCount', { count: words.length })}</span>
      </div>
      <div className={styles.chips}>
        {words.map((w) => (
          <button
            key={w}
            type="button"
            title={t('kwRemove')}
            className={styles.chip}
            onClick={() => remove.mutate(w)}
          >
            {w} ×
          </button>
        ))}
      </div>
      <div className={styles.kwAdd}>
        <input
          className={styles.kwInput}
          value={draft}
          placeholder={t('kwPh')}
          aria-label={t('kwPh')}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit(false)}
        />
        <button type="button" className={styles.kwBtn} onClick={() => submit(true)}>
          {t('kwAdd')}
        </button>
      </div>
    </aside>
  );
}
