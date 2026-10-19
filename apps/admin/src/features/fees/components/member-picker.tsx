'use client';

import type { FeeRow } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useMemberLookup } from '../hooks/use-member-lookup';
import styles from './fee-transactions.module.css';

interface Props {
  selected: FeeRow | null;
  onSelect: (m: FeeRow) => void;
}

/** Ô tìm thành viên (tên / email / Mã TV), debounce 300 ms, tối đa 10 gợi ý */
export function MemberPicker({ selected, onSelect }: Props) {
  const t = useTranslations('fees.txn.dialog');
  const [term, setTerm] = useState('');
  const found = useMemberLookup(term);
  const items = found.data?.items ?? [];
  const searching = term.trim().length >= 2 && found.isSuccess;

  return (
    <div className={styles.field}>
      <label className={styles.field}>
        {t('member')}
        <input
          type="search"
          className={styles.input}
          value={term}
          placeholder={t('memberPlaceholder')}
          onChange={(e) => setTerm(e.target.value)}
        />
      </label>
      {selected ? (
        <p className={styles.summary} data-testid="match-member">
          {t('picked', { name: selected.fullName, code: selected.memberCode })}
        </p>
      ) : null}
      {searching && items.length > 0 ? (
        <ul className={styles.options} aria-label={t('results')}>
          {items.map((m) => {
            const on = selected?.userId === m.userId;
            return (
              <li key={m.userId}>
                <button
                  type="button"
                  className={`${styles.option} ${on ? styles.optionOn : ''}`}
                  aria-pressed={on}
                  onClick={() => {
                    onSelect(m);
                    setTerm('');
                  }}
                >
                  <b>{m.fullName}</b>
                  <span className={styles.muted}>
                    {m.memberCode} · {m.email}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {searching && items.length === 0 ? (
        <span className={styles.muted}>{t('noResult')}</span>
      ) : null}
    </div>
  );
}
