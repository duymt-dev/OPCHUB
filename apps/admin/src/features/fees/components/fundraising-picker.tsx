'use client';

import type { PendingFundraising } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { usePendingFundraisings } from '../hooks/use-member-lookup';
import { vnd } from '../model';
import styles from './fee-transactions.module.css';

interface Props {
  /** Mã GV đọc được trong nội dung CK (`fundraisingHint`) → từ khoá ban đầu */
  hint: string | null;
  selected: PendingFundraising | null;
  onSelect: (f: PendingFundraising) => void;
}

/**
 * D-113 (F3): ô chọn khoản Gói Gọi vốn đang chờ thanh toán (mã GV / dự án / Mã TV chủ).
 * Gợi ý mã GV khớp đúng 1 khoản → chọn sẵn ở hộp Khớp tay.
 */
export function FundraisingPicker({ hint, selected, onSelect }: Props) {
  const t = useTranslations('fees.txn.dialog');
  const [term, setTerm] = useState(hint ?? '');
  const found = usePendingFundraisings(term);
  const items = found.data?.items ?? [];

  return (
    <div className={styles.field}>
      <label className={styles.field}>
        {t('fundraising')}
        <input
          type="search"
          className={styles.input}
          value={term}
          placeholder={t('fundraisingPlaceholder')}
          onChange={(e) => setTerm(e.target.value)}
        />
      </label>
      {selected ? (
        <p className={styles.summary} data-testid="match-fundraising">
          {t('pickedFundraising', { code: selected.code, project: selected.projectName })}
        </p>
      ) : null}
      {items.length > 0 ? (
        <ul className={styles.options} aria-label={t('fundraisingResults')}>
          {items.map((f) => {
            const on = selected?.id === f.id;
            return (
              <li key={f.id}>
                <button
                  type="button"
                  className={`${styles.option} ${on ? styles.optionOn : ''}`}
                  aria-pressed={on}
                  onClick={() => onSelect(f)}
                >
                  <b>
                    {f.code} · {f.projectName}
                  </b>
                  <span className={styles.muted}>
                    {f.ownerName} · {f.ownerCode} · {vnd(f.amount)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {found.isSuccess && items.length === 0 ? (
        <span className={styles.muted}>{t('noFundraising')}</span>
      ) : null}
    </div>
  );
}
