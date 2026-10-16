'use client';

import type { FeeSummary } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FEE_TABS, type FeeTab } from '../types';
import styles from './fees.module.css';

interface Props {
  q: string;
  status: FeeTab;
  summary: FeeSummary | undefined;
  onSearch: (q: string) => void;
  onTab: (tab: FeeTab) => void;
  onRemindAll: () => void;
}

const tabCount = (s: FeeSummary | undefined, tab: FeeTab) => {
  if (!s) return '';
  const n = {
    all: s.total,
    active: s.active,
    pending: s.pending_payment,
    soon: s.expiring,
    expired: s.expired,
  }[tab];
  return String(n);
};

/** Tiêu đề "Phí thành viên hệ thống" + ô tìm + "Gửi nhắc hàng loạt" + tab trạng thái */
export function FeeToolbar({ q, status, summary, onSearch, onTab, onRemindAll }: Props) {
  const t = useTranslations('fees');
  // Giữ chữ đang gõ tại chỗ; URL cập nhật cùng lúc (useUrlParams)
  const [text, setText] = useState(q);
  return (
    <>
      <div className={styles.head}>
        <h2 className={styles.heading}>{t('heading')}</h2>
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
        <button type="button" className={styles.btn} onClick={onRemindAll}>
          {t('remindAll')}
        </button>
      </div>
      <div className={styles.tabs} role="radiogroup" aria-label={t('tabsLabel')}>
        {FEE_TABS.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={status === k}
            className={`${styles.tab} ${status === k ? styles.tabOn : ''}`}
            onClick={() => onTab(k)}
          >
            {t(`tabs.${k}`)}
            <span className={styles.tabCount}>{tabCount(summary, k)}</span>
          </button>
        ))}
      </div>
    </>
  );
}
